import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/** "106,48 €" */
export function formatPrice(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return `${Number(amount).toFixed(2).replace('.', ',')} €`;
}

/** "2 avril 2026" */
export function formatDateFr(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

/** "10h00" */
export function formatTimeFr(timeStr) {
  if (!timeStr) return '';
  return timeStr.replace(':', 'h');
}

/** "+32 471 00 00 01" */
export function formatPhoneBe(phone) {
  if (!phone) return '';
  let p = phone.trim().replace(/\s+/g, '');
  if (p.startsWith('0032')) p = '+32' + p.slice(4);
  if (p.startsWith('0') && !p.startsWith('+')) p = '+32' + p.slice(1);
  // Format: +32 XXX XX XX XX
  const digits = p.replace(/[^0-9]/g, '');
  if (digits.length >= 9) {
    const country = digits.slice(0, 2); // 32
    const rest = digits.slice(2);
    if (rest.length === 9) {
      return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7)}`;
    }
  }
  return phone;
}

/** Display name from user object */
export function getDisplayName(user) {
  if (!user) return '';
  if (user.first_name || user.last_name) return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const raw = (user.full_name || '').includes('@') ? user.full_name.split('@')[0] : (user.full_name || '');
  const smart = raw.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
  if (smart.length >= 2) return smart.charAt(0).toUpperCase() + smart.slice(1).toLowerCase();
  return user.email?.split('@')[0] || 'Utilisateur';
}