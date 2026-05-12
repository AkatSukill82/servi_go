/**
 * useAppleIAP.js
 * Hook React pour gérer les achats in-app Apple via cordova-plugin-purchase (CdvPurchase)
 * Compatible Capacitor + iOS natif
 *
 * Produits à créer dans App Store Connect :
 *   - servigo.pro.monthly  → 10,99€/mois (auto-renewing subscription)
 *   - servigo.pro.yearly   → 99,99€/an   (auto-renewing subscription)
 */

import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const PRODUCT_IDS = {
  monthly: 'servigo.pro.monthly',
  yearly:  'servigo.pro.yearly',
  annual:  'servigo.pro.yearly', // alias used by ProSubscription
};

// window.Capacitor is injected by the native bridge before any JS runs — always reliable.
// window.CdvPurchase may not be ready at first render, so never use it for routing.
const isNative =
  typeof window !== 'undefined' &&
  !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === 'ios');

// The CdvPurchase store plugin (may load slightly after Capacitor bridge)
const hasCdvStore = () =>
  typeof window !== 'undefined' && window.CdvPurchase !== undefined;

export function useAppleIAP(user) {
  const [storeReady, setStoreReady] = useState(false);
  const [products, setProducts] = useState({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // ─── Initialisation du store ───────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;
    if (!hasCdvStore()) return; // Plugin not yet loaded — skip

    const { store, ProductType, Platform } = window.CdvPurchase;

    // Enregistrer les produits
    store.register([
      {
        id: PRODUCT_IDS.monthly,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.yearly,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      },
    ]);

    // Listener : produits chargés
    store.when()
      .productUpdated((product) => {
        setProducts((prev) => ({ ...prev, [product.id]: product }));
      })
      .approved((transaction) => {
        // Vérification côté serveur AVANT de finisher
        verifyAndActivate(transaction);
      })
      .finished((transaction) => {
        console.log('[IAP] Transaction finalisée :', transaction.transactionId);
      });

    // Initialiser le store
    store.initialize([Platform.APPLE_APPSTORE]).then(() => {
      setStoreReady(true);
      store.update(); // Rafraîchir les produits
    });

    return () => {
      // Cleanup listeners si nécessaire
    };
  }, []);

  // ─── Vérification receipt côté serveur Base44 ──────────────────────────────
  const verifyAndActivate = useCallback(async (transaction) => {
    try {
      const receipt = transaction.parentReceipt;
      const productId = transaction.products?.[0]?.id;
      const plan = productId === PRODUCT_IDS.yearly ? 'annual' : 'monthly';

      // Appel à ta fonction Base44 pour valider le receipt Apple
      const res = await base44.functions.invoke('verifyAppleReceipt', {
        receiptData: receipt.nativeData?.appStoreReceipt || receipt.serialize(),
        productId,
        plan,
        userEmail: user?.email,
      });

      if (res.data?.success) {
        // Finaliser la transaction côté Apple (obligatoire !)
        transaction.finish();
        toast.success('Abonnement Pro activé ! 🎉');
        setPurchasing(false);
      } else {
        toast.error('Erreur de vérification. Contactez le support.');
        setPurchasing(false);
      }
    } catch (err) {
      console.error('[IAP] Erreur vérification :', err);
      toast.error('Erreur : ' + (err?.message || 'réessayez'));
      setPurchasing(false);
    }
  }, [user]);

  // ─── Lancer un achat ───────────────────────────────────────────────────────
  const purchase = useCallback(async (plan = 'monthly') => {
    if (!isNative) {
      toast.error('Le paiement est disponible uniquement sur l\'application iOS.');
      return;
    }

    if (!hasCdvStore()) {
      toast.error('Plugin de paiement non disponible. Relancez l\'application.');
      return;
    }

    if (!storeReady) {
      toast.error('Store non disponible. Réessayez dans quelques secondes.');
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
      toast.error('Achat annulé ou erreur : ' + (err?.message || ''));
      setPurchasing(false);
    }
  }, [storeReady, products, user]);

  // ─── Restaurer les achats ──────────────────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    if (!isNative) {
      toast.info('Restauration disponible uniquement sur iOS.');
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
      price: product.offers?.[0]?.pricingPhases?.[0]?.price || (plan === 'yearly' ? '99,99 €' : '10,99 €'),
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
