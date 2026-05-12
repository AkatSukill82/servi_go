/**
 * Helpers partagés liés au profil utilisateur.
 * Importez depuis ici pour éviter la duplication entre Home et ProDashboard.
 */

export const getFirstName = (user) => {
  if (user?.first_name) return user.first_name;
  const handle = user?.full_name || '';
  const letters = handle.match(/^[a-zA-ZÀ-ɏ]+/)?.[0] || '';
  if (letters.length >= 2) return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
  return '';
};

export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};
