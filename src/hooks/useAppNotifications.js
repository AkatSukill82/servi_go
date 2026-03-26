import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Demande la permission et écoute les événements en temps réel
 * pour notifier client et pro selon leur type d'utilisateur.
 */
export function useAppNotifications(user) {
  const permissionAsked = useRef(false);

  // Demande la permission dès qu'on a l'utilisateur
  useEffect(() => {
    if (!user || permissionAsked.current) return;
    permissionAsked.current = true;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const notify = (title, body) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  // Abonnements temps réel
  useEffect(() => {
    if (!user?.email) return;

    const isPro = user.user_type === 'professionnel';

    // Écoute les factures
    const unsubInvoice = base44.entities.Invoice.subscribe((event) => {
      if (event.type !== 'create') return;
      const inv = event.data;
      if (!inv) return;

      if (!isPro && inv.customer_email === user.email) {
        // Client : nouvelle facture reçue
        notify('📄 Facture reçue', `Facture ${inv.invoice_number} disponible — à signer`);
      }
      if (isPro && inv.professional_name === user.full_name) {
        // Pro : facture générée pour lui → à signer
        notify('✍️ Facture à signer', `Facture ${inv.invoice_number} en attente de votre signature`);
      }
    });

    // Écoute les demandes de service
    const unsubRequest = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.type !== 'update') return;
      const req = event.data;
      if (!req) return;

      if (!isPro && req.customer_email === user.email) {
        // Client : un pro a accepté
        if (req.status === 'accepted') {
          notify('✅ Mission acceptée !', `${req.professional_name || 'Un professionnel'} a accepté votre demande`);
        }
      }

      if (isPro && req.professional_email === user.email) {
        // Pro : nouvelle mission assignée
        if (req.status === 'accepted') {
          notify('🚀 Nouvelle mission !', `Mission ${req.category_name} · ${req.customer_address || ''}`);
        }
      }
    });

    return () => {
      unsubInvoice();
      unsubRequest();
    };
  }, [user?.email, user?.user_type]);
}