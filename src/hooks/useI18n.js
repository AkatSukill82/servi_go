const strings = {
  // Landing
  landing_tagline: 'La plateforme pro',
  landing_title: 'Trouvez le bon\nprofessionnel,\nmaintenant.',
  landing_subtitle: 'Mettez en relation particuliers et artisans qualifiés près de chez vous.',
  landing_cta: 'Créer un compte gratuitement',
  landing_login: 'Se connecter',
  landing_fast: 'Rapide',
  landing_fast_text: 'Un pro disponible en quelques minutes',
  landing_secure: 'Sécurisé',
  landing_secure_text: 'Paiements protégés, pros vérifiés',
  landing_reliable: 'Fiable',
  landing_reliable_text: 'Noté par de vrais clients',
  // Home
  home_greeting: 'Bonjour',
  home_subtitle: 'Quel service recherchez-vous ?',
  home_search_placeholder: 'Rechercher un service...',
  home_our_services: 'Nos services',
  home_no_service: 'Aucun service trouvé',
  home_sos_title: 'Urgence ? Mode SOS',
  home_sos_subtitle: 'Professionnel mobilisé en priorité',
  home_mission_accepted: 'Mission acceptée',
  home_track: 'Appuyez pour suivre sur la carte',
  // Nav
  nav_home: 'Accueil',
  nav_map: 'Carte',
  nav_favorites: 'Favoris',
  nav_request: 'Demande',
  nav_invoices: 'Factures',
  nav_profile: 'Profil',
  nav_dashboard: 'Dashboard',
  nav_history: 'Historique',
  nav_pro_profile: 'Mon profil',
  // Common
  btn_continue: 'Continuer',
  btn_back: 'Retour',
  btn_confirm: 'Confirmer',
  btn_cancel: 'Annuler',
  btn_save: 'Enregistrer',
  // ServiceRequest
  sr_address: "Votre adresse d'intervention",
  sr_searching: 'Recherche en cours...',
  sr_quote: 'Votre devis',
  sr_confirmed: 'Confirmé !',
  sr_slot: 'Date & heure',
  // Profile
  profile_title: 'Mon profil',
  profile_tab_profile: 'Profil',
  profile_tab_receipts: 'Reçus',
  profile_tab_documents: 'Documents',
  profile_personal_info: 'Informations personnelles',
  profile_fullname: 'Nom complet',
  profile_phone: 'Téléphone',
  profile_address: 'Adresse',
  profile_iban: 'IBAN (Données bancaires)',
  profile_save: 'Sauvegarder',
  profile_logout: 'Déconnexion',
  profile_delete: 'Supprimer mon compte',
  profile_saving: 'Sauvegarde...',
  profile_delete_confirm_title: 'Supprimer votre compte ?',
  profile_delete_confirm_desc: 'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
  profile_delete_confirm_btn: 'Supprimer',
};

export function useI18n() {
  const t = (key) => strings[key] ?? key;
  return { lang: 'fr', t, setLang: () => {}, SUPPORTED_LANGS: ['fr'] };
}