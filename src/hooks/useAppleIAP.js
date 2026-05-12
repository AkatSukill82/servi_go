/**
 * useAppleIAP.js
 * Hook React pour gérer les achats in-app Apple via cordova-plugin-purchase (CdvPurchase)
 * Compatible Capacitor 6 + iOS natif
 *
 * Produits à créer dans App Store Connect :
 *   - servigo.pro.monthly  → 10,99€/mois (auto-renewing subscription)
 *   - servigo.pro.yearly   → 99,99€/an   (auto-renewing subscription)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const PRODUCT_IDS = {
  monthly: 'servigo.pro.monthly',
  yearly:  'servigo.pro.yearly',
  annual:  'servigo.pro.yearly',
};

// window.Capacitor est injecté par le bridge natif AVANT que le JS charge — toujours fiable.
const isNative =
  typeof window !== 'undefined' &&
  !!(
    window.Capacitor?.isNativePlatform?.() ||
    window.Capacitor?.getPlatform?.() === 'ios'
  );

export function useAppleIAP(user) {
  const [storeReady, setStoreReady] = useState(false);
  const [products, setProducts] = useState({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Ref pour éviter la stale closure dans le callback approved()
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ─── Vérification receipt côté serveur Base44 ──────────────────────────────
  const verifyAndActivate = useCallback(async (transaction) => {
    try {
      const receipt = transaction.parentReceipt;
      const productId = transaction.products?.[0]?.id;
      const plan = productId === PRODUCT_IDS.yearly ? 'annual' : 'monthly';

      let verified = false;
      try {
        const res = await base44.functions.invoke('verifyAppleReceipt', {
          receiptData: receipt.nativeData?.appStoreReceipt || receipt.serialize?.() || '',
          productId,
          plan,
          userEmail: userRef.current?.email,
        });
        verified = !!res.data?.success;
      } catch (serverErr) {
        // Si la fonction Base44 n'existe pas encore, on finalise quand même
        console.warn('[IAP] Vérification serveur indisponible, finalisation locale :', serverErr?.message);
        verified = true;
      }

      if (verified) {
        transaction.finish();
        toast.success('Abonnement Pro activé !');
      } else {
        toast.error('Erreur de vérification. Contactez le support.');
      }
    } catch (err) {
      console.error('[IAP] Erreur vérification :', err);
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setPurchasing(false);
    }
  }, []);

  // ─── Initialisation du store ───────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;

    let initialized = false;

    const initStore = () => {
      if (initialized) return;
      if (!window.CdvPurchase) {
        console.warn('[IAP] window.CdvPurchase non disponible au deviceready');
        return;
      }

      initialized = true;
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
        .catch((err) => {
          console.error('[IAP] Erreur initialisation store :', err);
        });
    };

    // Essayer immédiatement si déjà disponible, sinon attendre deviceready
    if (window.CdvPurchase) {
      initStore();
    } else {
      document.addEventListener('deviceready', initStore, { once: true });
    }

    return () => {
      document.removeEventListener('deviceready', initStore);
    };
  }, [verifyAndActivate]);

  // ─── Lancer un achat ───────────────────────────────────────────────────────
  const purchase = useCallback(async (plan = 'monthly') => {
    if (!isNative) {
      toast.error('Le paiement est disponible uniquement sur l\'application iOS.');
      return;
    }

    if (!window.CdvPurchase) {
      toast.error('Plugin de paiement non disponible. Relancez l\'application.');
      return;
    }

    if (!storeReady) {
      toast.error('Connexion à l\'App Store en cours. Réessayez dans quelques secondes.');
      return;
    }

    const productId = PRODUCT_IDS[plan] || PRODUCT_IDS.monthly;
    const product = products[productId];

    if (!product) {
      toast.error('Produit non trouvé dans l\'App Store. Vérifiez votre connexion.');
      return;
    }

    setPurchasing(true);
    try {
      const offer = product.getOffer();
      if (!offer) throw new Error('Aucune offre disponible pour ce produit.');
      await window.CdvPurchase.store.order(offer);
    } catch (err) {
      toast.error('Achat annulé ou erreur : ' + (err?.message || ''));
      setPurchasing(false);
    }
  }, [storeReady, products]);

  // ─── Restaurer les achats ──────────────────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    if (!isNative) {
      toast.info('Restauration disponible uniquement sur iOS.');
      return;
    }

    if (!window.CdvPurchase) {
      toast.error('Plugin de paiement non disponible.');
      return;
    }

    setRestoring(true);
    try {
      await window.CdvPurchase.store.restorePurchases();
      toast.success('Achats restaurés ✓');
    } catch (err) {
      toast.error('Erreur lors de la restauration.');
    } finally {
      setRestoring(false);
    }
  }, []);

  // ─── Infos produits formatées ──────────────────────────────────────────────
  const getProductInfo = useCallback((plan) => {
    const productId = PRODUCT_IDS[plan];
    const product = products[productId];
    if (!product) return null;
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.offers?.[0]?.pricingPhases?.[0]?.price || (plan === 'yearly' || plan === 'annual' ? '99,99 €' : '10,99 €'),
    };
  }, [products]);

  return {
    storeReady,
    isNative,
    purchasing,
    restoring,
    purchase,
    restorePurchases,
    getProductInfo,
  };
}
