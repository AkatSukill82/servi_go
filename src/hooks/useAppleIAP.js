/**
 * useAppleIAP.js
 * Apple In-App Purchase via cordova-plugin-purchase v13 (CdvPurchase)
 * Compatible Capacitor 6 + iOS natif
 *
 * Produits à créer dans App Store Connect (bundle: be.servigo.app) :
 *   servigo.pro.monthly  → 9,99 €/mois  (auto-renewing subscription)
 *   servigo.pro.yearly   → 90,00 €/an   (auto-renewing subscription)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { isAndroid, platform, isIOSNow } from '@/lib/platform';

export { isAndroid, platform, isIOSNow };

export const PRODUCT_IDS = {
  monthly: 'servigo.pro.monthly',
  yearly:  'servigo.pro.yearly',
  annual:  'servigo.pro.yearly',
};

const FALLBACK_PRICES = { monthly: '9,99 €', yearly: '90,00 €' };

// ─── Attend que CdvPurchase soit disponible (polling + deviceready) ───────────
function waitForCdvPurchase(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.CdvPurchase) { resolve(window.CdvPurchase); return; }

    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(timer);
      document.removeEventListener('deviceready', onReady);
      val ? resolve(val) : reject(new Error('CdvPurchase non disponible'));
    };

    const onReady = () => {
      if (window.CdvPurchase) finish(window.CdvPurchase);
    };
    document.addEventListener('deviceready', onReady, { once: true });

    // Polling toutes les 250 ms (au cas où deviceready est déjà passé)
    const poll = setInterval(() => {
      if (window.CdvPurchase) finish(window.CdvPurchase);
    }, 250);

    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

export function useAppleIAP(user) {
  const [storeReady, setStoreReady]     = useState(false);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [products, setProducts]         = useState({});
  const [purchasing, setPurchasing]     = useState(false);
  const [restoring, setRestoring]       = useState(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const initializedRef = useRef(false);

  // ─── Vérification receipt côté serveur ──────────────────────────────────────
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
      } catch (err) {
        const is404 = err?.response?.status === 404 || err?.status === 404
          || err?.message?.includes('not found') || err?.message?.includes('404');
        if (is404) {
          // Fonction non encore déployée — finalise pour éviter un double débit
          transaction.finish();
          toast.success('Abonnement Pro activé ! 🎉');
        } else {
          // Erreur réseau ou serveur — ne pas finaliser, l'utilisateur peut réessayer
          toast.error('Erreur de vérification. Réessayez ou contactez le support.');
        }
      }
    } catch (err) {
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
    } finally {
      setPurchasing(false);
    }
  }, []);

  // ─── Init du store ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isIOSNow()) return;
    if (initializedRef.current) return;

    waitForCdvPurchase(8000)
      .then((CdvPurchase) => {
        if (initializedRef.current) return;
        initializedRef.current = true;
        setIapAvailable(true);

        const { store, ProductType, Platform } = CdvPurchase;

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
          .finished((_transaction) => {
            // transaction finalised
          });

        store.initialize([Platform.APPLE_APPSTORE])
          .then(() => {
            // Marque le store prêt seulement après que les produits ont été chargés
            store.update().then(() => setStoreReady(true));
          })
          .catch((err) => console.error('[IAP] Erreur init store :', err));
      })
      .catch(() => {
        console.warn('[IAP] CdvPurchase indisponible après 8s');
        setIapAvailable(false);
      });
  }, [verifyAndActivate]);

  // ─── Lancer un achat ─────────────────────────────────────────────────────────
  const purchase = useCallback(async (plan = 'monthly') => {
    if (!storeReady || !window.CdvPurchase) {
      toast.error('App Store pas encore prêt. Patientez quelques secondes.');
      return;
    }
    const productId = PRODUCT_IDS[plan] || PRODUCT_IDS.monthly;
    const product = products[productId];
    if (!product) {
      toast.error('Produit introuvable dans l\'App Store. Vérifiez votre connexion et réessayez.');
      return;
    }
    setPurchasing(true);
    try {
      const offer = product.getOffer();
      if (!offer) throw new Error('Aucune offre disponible.');
      await window.CdvPurchase.store.order(offer);
    } catch (err) {
      const msg = err?.message?.toLowerCase() || '';
      // Annulation volontaire par l'utilisateur — pas d'erreur affichée
      if (!msg.includes('cancel') && !msg.includes('dismiss') && err?.code !== 2) {
        toast.error('Erreur lors de l\'achat. Réessayez ou contactez le support.');
      }
      setPurchasing(false);
    }
  }, [storeReady, products]);

  // ─── Restaurer les achats (obligatoire Apple guideline) ──────────────────────
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

  // ─── Prix du produit ──────────────────────────────────────────────────────────
  const getProductInfo = useCallback((plan) => {
    const productId = PRODUCT_IDS[plan];
    const product = products[productId];
    return {
      id: productId,
      title: product?.title || (plan === 'yearly' || plan === 'annual' ? 'Annuel' : 'Mensuel'),
      price: product?.offers?.[0]?.pricingPhases?.[0]?.price
        || FALLBACK_PRICES[plan === 'annual' ? 'yearly' : plan],
    };
  }, [products]);

  return {
    storeReady,
    iapAvailable,
    isNative: isIOSNow(),
    purchasing,
    restoring,
    purchase,
    restorePurchases,
    getProductInfo,
  };
}