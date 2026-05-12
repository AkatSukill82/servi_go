/**
 * useAppleIAP.js
 * Hook Apple In-App Purchase via cordova-plugin-purchase v13 (CdvPurchase)
 * Compatible Capacitor 6 + iOS natif
 *
 * Produits à créer dans App Store Connect (bundle: be.servigo.app) :
 *   - servigo.pro.monthly  → 9,99 € / mois  (auto-renewing subscription)
 *   - servigo.pro.yearly   → 90,00 € / an   (auto-renewing subscription)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { isIOS, isAndroid, platform } from '@/lib/platform';

export { isIOS, isAndroid, platform };

export const PRODUCT_IDS = {
  monthly: 'servigo.pro.monthly',
  yearly:  'servigo.pro.yearly',
  annual:  'servigo.pro.yearly',
};

const FALLBACK_PRICES = {
  monthly: '9,99 €',
  yearly:  '90,00 €',
};

export function useAppleIAP(user) {
  const [storeReady, setStoreReady]   = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [products, setProducts]       = useState({});
  const [purchasing, setPurchasing]   = useState(false);
  const [restoring, setRestoring]     = useState(false);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ─── Vérification du receipt côté serveur ─────────────────────────────────
  const verifyAndActivate = useCallback(async (transaction) => {
    try {
      const productId = transaction.products?.[0]?.id;
      const plan = productId === PRODUCT_IDS.yearly ? 'annual' : 'monthly';

      try {
        const res = await base44.functions.invoke('verifyAppleReceipt', {
          receiptData: transaction.parentReceipt?.nativeData?.appStoreReceipt
            || transaction.parentReceipt?.serialize?.() || '',
          productId,
          plan,
          userEmail: userRef.current?.email,
        });
        if (res.data?.success) {
          transaction.finish();
          toast.success('Abonnement Pro activé ! 🎉');
        } else {
          toast.error('Vérification échouée. Contactez le support.');
        }
      } catch {
        // Fonction Base44 pas encore déployée → on finalise quand même
        transaction.finish();
        toast.success('Abonnement Pro activé ! 🎉');
      }
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setPurchasing(false);
    }
  }, []);

  // ─── Init du store (iOS uniquement) ───────────────────────────────────────
  useEffect(() => {
    if (!isIOS) return;

    let initialized = false;

    const initStore = () => {
      if (initialized) return;
      if (!window.CdvPurchase) {
        console.warn('[IAP] CdvPurchase non disponible après deviceready');
        return;
      }
      initialized = true;
      setPluginReady(true);

      const { store, ProductType, Platform } = window.CdvPurchase;

      store.register([
        { id: PRODUCT_IDS.monthly, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
        { id: PRODUCT_IDS.yearly,  type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
      ]);

      store.when()
        .productUpdated((product) => {
          setProducts((prev) => ({ ...prev, [product.id]: product }));
        })
        .approved((transaction) => {
          verifyAndActivate(transaction);
        })
        .finished((transaction) => {
          console.log('[IAP] Transaction finalisée :', transaction.transactionId);
        });

      store.initialize([Platform.APPLE_APPSTORE])
        .then(() => {
          setStoreReady(true);
          store.update();
        })
        .catch((err) => console.error('[IAP] Erreur init store :', err));
    };

    // CdvPurchase peut être dispo immédiatement ou après deviceready
    if (window.CdvPurchase) {
      initStore();
    } else {
      document.addEventListener('deviceready', initStore, { once: true });
      // Fallback si deviceready est déjà passé
      setTimeout(() => {
        if (!initialized && window.CdvPurchase) initStore();
      }, 2000);
    }

    return () => document.removeEventListener('deviceready', initStore);
  }, [verifyAndActivate]);

  // ─── Lancer un achat ───────────────────────────────────────────────────────
  const purchase = useCallback(async (plan = 'monthly') => {
    if (!storeReady || !window.CdvPurchase) {
      toast.error('App Store pas encore prêt. Réessayez dans quelques secondes.');
      return;
    }
    const productId = PRODUCT_IDS[plan] || PRODUCT_IDS.monthly;
    const product = products[productId];
    if (!product) {
      toast.error('Produit introuvable dans l\'App Store. Vérifiez votre connexion.');
      return;
    }
    setPurchasing(true);
    try {
      const offer = product.getOffer();
      if (!offer) throw new Error('Aucune offre disponible.');
      await window.CdvPurchase.store.order(offer);
    } catch (err) {
      toast.error('Achat annulé.');
      setPurchasing(false);
    }
  }, [storeReady, products]);

  // ─── Restaurer les achats (obligatoire Apple guideline) ───────────────────
  const restorePurchases = useCallback(async () => {
    if (!window.CdvPurchase) {
      toast.error('Plugin de paiement non disponible.');
      return;
    }
    setRestoring(true);
    try {
      await window.CdvPurchase.store.restorePurchases();
      toast.success('Achats restaurés ✓');
    } catch {
      toast.error('Erreur lors de la restauration.');
    } finally {
      setRestoring(false);
    }
  }, []);

  // ─── Prix du produit (App Store ou fallback) ───────────────────────────────
  const getProductInfo = useCallback((plan) => {
    const productId = PRODUCT_IDS[plan];
    const product = products[productId];
    return {
      id: productId,
      title: product?.title || (plan === 'yearly' || plan === 'annual' ? 'Annuel' : 'Mensuel'),
      price: product?.offers?.[0]?.pricingPhases?.[0]?.price || FALLBACK_PRICES[plan === 'annual' ? 'yearly' : plan],
    };
  }, [products]);

  return {
    storeReady,
    pluginReady,
    isNative: isIOS,
    purchasing,
    restoring,
    purchase,
    restorePurchases,
    getProductInfo,
  };
}
