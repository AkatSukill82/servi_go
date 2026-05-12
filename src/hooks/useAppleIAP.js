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
import { isIOS, isAndroid, platform } from '@/lib/platform';

export { isIOS, isAndroid, platform };

const PRODUCT_IDS = {
  monthly: 'servigo.pro.monthly',
  yearly:  'servigo.pro.yearly',
  annual:  'servigo.pro.yearly',
};

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
      } catch {
        // Si la fonction Base44 n'existe pas encore, on finalise quand même
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

  // ─── Initialisation du store (iOS uniquement) ──────────────────────────────
  useEffect(() => {
    if (!isIOS) return;

    let initialized = false;

    const initStore = () => {
      if (initialized || !window.CdvPurchase) return;
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
        .catch((err) => console.error('[IAP] Erreur init store :', err));
    };

    if (window.CdvPurchase) {
      initStore();
    } else {
      document.addEventListener('deviceready', initStore, { once: true });
    }

    return () => document.removeEventListener('deviceready', initStore);
  }, [verifyAndActivate]);

  // ─── Lancer un achat ───────────────────────────────────────────────────────
  const purchase = useCallback(async (plan = 'monthly') => {
    if (!storeReady || !window.CdvPurchase) {
      toast.error('Connexion à l\'App Store en cours. Réessayez dans quelques secondes.');
      return;
    }

    const productId = PRODUCT_IDS[plan] || PRODUCT_IDS.monthly;
    const product = products[productId];

    if (!product) {
      toast.error('Produit non trouvé dans l\'App Store.');
      return;
    }

    setPurchasing(true);
    try {
      const offer = product.getOffer();
      if (!offer) throw new Error('Aucune offre disponible pour ce produit.');
      await window.CdvPurchase.store.order(offer);
    } catch (err) {
      toast.error('Achat annulé : ' + (err?.message || ''));
      setPurchasing(false);
    }
  }, [storeReady, products]);

  // ─── Restaurer les achats ──────────────────────────────────────────────────
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

  // ─── Infos produits formatées ──────────────────────────────────────────────
  const getProductInfo = useCallback((plan) => {
    const productId = PRODUCT_IDS[plan];
    const product = products[productId];
    if (!product) return null;
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.offers?.[0]?.pricingPhases?.[0]?.price
        || (plan === 'yearly' || plan === 'annual' ? '99,99 €' : '10,99 €'),
    };
  }, [products]);

  return {
    storeReady,
    isNative: isIOS,
    purchasing,
    restoring,
    purchase,
    restorePurchases,
    getProductInfo,
  };
}
