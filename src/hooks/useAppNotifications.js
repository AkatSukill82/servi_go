import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * Demande la permission et écoute les événements en temps réel
 * pour notifier client et pro selon leur type d'utilisateur.
 */
function fireNotification(title, body, actionUrl, navigate) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/favicon.ico' });
  n.onclick = () => {
    window.focus();
    n.close();
    if (navigate && actionUrl) navigate(actionUrl);
  };
}

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

  let navigate;
  try {
    // useNavigate must be called inside Router context
    navigate = useNavigate(); // eslint-disable-line react-hooks/rules-of-hooks
  } catch {}

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
        fireNotification('📄 Facture reçue', `Facture ${inv.invoice_number} disponible — à signer`, '/Invoices', navigate);
      }
      if (isPro && inv.professional_name === user.full_name) {
        fireNotification('✍️ Facture à signer', `Facture ${inv.invoice_number} en attente de votre signature`, '/Invoices', navigate);
      }
    });

    // Écoute les notifications ServiGo (toutes catégories)
    const unsubNotif = base44.entities.Notification.subscribe((event) => {
      if (event.type !== 'create') return;
      const notif = event.data;
      if (!notif || notif.recipient_email !== user.email) return;
      fireNotification(notif.title, notif.body || '', notif.action_url, navigate);
    });

    // Écoute les demandes de service V2
    const unsubRequest = base44.entities.ServiceRequestV2.subscribe((event) => {
      if (event.type !== 'update') return;
      const req = event.data;
      if (!req) return;

      if (!isPro && req.customer_email === user.email) {
        if (req.status === 'accepted') {
          fireNotification('✅ Mission acceptée !', `${req.professional_name || 'Un professionnel'} a accepté votre demande`, `/Chat?requestId=${req.id}`, navigate);
        } else if (req.status === 'pro_en_route') {
          fireNotification('🚗 Pro en route !', `${req.professional_name} arrive chez vous`, `/TrackingMap?requestId=${req.id}`, navigate);
        } else if (req.status === 'completed') {
          fireNotification('🎉 Mission terminée', `La mission ${req.category_name} est terminée`, `/Chat?requestId=${req.id}`, navigate);
        }
      }

      if (isPro && req.professional_email === user.email) {
        if (req.status === 'contract_signed') {
          fireNotification('✍️ Contrat signé !', `Le client a signé. Vous pouvez démarrer la mission.`, `/Chat?requestId=${req.id}`, navigate);
        }
      }
    });

    return () => {
      unsubInvoice();
      unsubNotif();
      unsubRequest();
    };
  }, [user?.email, user?.user_type]);
}