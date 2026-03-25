// Belgian regional subsidies database
// Regions: wallonie | bruxelles | flandre
// Linked to service category keywords

export const SUBSIDIES = [
  // ── ISOLATION / THERMIQUE ──
  {
    id: 'wall_iso_1',
    regions: ['wallonie'],
    keywords: ['isolation', 'toiture', 'combles', 'murs', 'fenêtres', 'vitre', 'chauffage'],
    name: 'Prime Énergie Wallonie — Isolation',
    description: 'Prime pour l\'isolation du toit, des murs ou du sol. Jusqu\'à 4 800 € selon les revenus.',
    max_amount: 4800,
    url: 'https://energie.wallonie.be/fr/prime-isolation.html',
    color: 'green',
  },
  {
    id: 'bxl_iso_1',
    regions: ['bruxelles'],
    keywords: ['isolation', 'toiture', 'combles', 'murs', 'fenêtres', 'chauffage'],
    name: 'Prime Bruxelles Énergie — Isolation',
    description: 'Subsides Bruxelles Environnement pour isolation thermique. Jusqu\'à 6 000 €.',
    max_amount: 6000,
    url: 'https://environnement.brussels/thematiques/energie/primes-et-aides/les-primes-energie',
    color: 'green',
  },
  {
    id: 'fla_iso_1',
    regions: ['flandre'],
    keywords: ['isolation', 'toiture', 'combles', 'murs', 'fenêtres', 'chauffage'],
    name: 'Mijn VerbouwPremie — Isolatie',
    description: 'Vlaamse premie voor dak-, muur- en vloerisolatie. Tot 4 000 €.',
    max_amount: 4000,
    url: 'https://www.vlaanderen.be/mijn-verbouwpremie',
    color: 'green',
  },

  // ── POMPE À CHALEUR / PAC ──
  {
    id: 'wall_pac_1',
    regions: ['wallonie'],
    keywords: ['pompe à chaleur', 'pac', 'chauffage', 'climatisation', 'hvac', 'plombier', 'plomberie'],
    name: 'Prime PAC — Wallonie',
    description: 'Prime pour l\'installation d\'une pompe à chaleur (air/eau, sol/eau). Jusqu\'à 8 000 €.',
    max_amount: 8000,
    url: 'https://energie.wallonie.be/fr/prime-pompe-a-chaleur.html',
    color: 'blue',
  },
  {
    id: 'bxl_pac_1',
    regions: ['bruxelles'],
    keywords: ['pompe à chaleur', 'pac', 'chauffage', 'climatisation', 'plombier', 'plomberie'],
    name: 'Prime PAC — Bruxelles',
    description: 'Subsides Bruxelles pour pompe à chaleur. Jusqu\'à 5 000 €.',
    max_amount: 5000,
    url: 'https://environnement.brussels/thematiques/energie/primes-et-aides/les-primes-energie',
    color: 'blue',
  },
  {
    id: 'fla_pac_1',
    regions: ['flandre'],
    keywords: ['pompe à chaleur', 'pac', 'chauffage', 'warmtepomp', 'plombier', 'plomberie'],
    name: 'Premie Warmtepomp — Vlaanderen',
    description: 'Vlaamse premie voor de installatie van een warmtepomp. Tot 5 500 €.',
    max_amount: 5500,
    url: 'https://www.vlaanderen.be/mijn-verbouwpremie',
    color: 'blue',
  },

  // ── PANNEAUX SOLAIRES ──
  {
    id: 'wall_solar_1',
    regions: ['wallonie'],
    keywords: ['solaire', 'panneaux', 'photovoltaïque', 'électricien', 'électricité'],
    name: 'Prime Photovoltaïque — Wallonie',
    description: 'Aide à l\'installation de panneaux solaires. Variable selon puissance installée.',
    max_amount: 3000,
    url: 'https://energie.wallonie.be/fr/prime-photovoltaique.html',
    color: 'yellow',
  },
  {
    id: 'bxl_solar_1',
    regions: ['bruxelles'],
    keywords: ['solaire', 'panneaux', 'photovoltaïque', 'électricien', 'électricité'],
    name: 'Prime Photovoltaïque — Bruxelles',
    description: 'Subsides pour panneaux solaires à Bruxelles. Jusqu\'à 2 500 €.',
    max_amount: 2500,
    url: 'https://environnement.brussels/thematiques/energie/primes-et-aides/les-primes-energie',
    color: 'yellow',
  },
  {
    id: 'fla_solar_1',
    regions: ['flandre'],
    keywords: ['solaire', 'panneaux', 'photovoltaïque', 'zonnepanelen', 'électricien', 'électricité'],
    name: 'Premie Zonnepanelen — Vlaanderen',
    description: 'Vlaamse subsidie voor zonnepanelen. Maximaal 1 500 €.',
    max_amount: 1500,
    url: 'https://www.vlaanderen.be/zonnepanelen',
    color: 'yellow',
  },

  // ── RÉNOVATION GÉNÉRALE ──
  {
    id: 'wall_renov_1',
    regions: ['wallonie'],
    keywords: ['rénovation', 'peinture', 'plafond', 'carrelage', 'parquet', 'menuisier', 'menuiserie'],
    name: 'Prime Rénovation — Wallonie',
    description: 'Aide globale à la rénovation d\'un logement en Wallonie. Jusqu\'à 15 000 €.',
    max_amount: 15000,
    url: 'https://logement.wallonie.be/fr/aides/prime-renovation',
    color: 'orange',
  },
  {
    id: 'bxl_renov_1',
    regions: ['bruxelles'],
    keywords: ['rénovation', 'peinture', 'plafond', 'carrelage', 'parquet', 'menuisier', 'menuiserie'],
    name: 'Primes Rénolution — Bruxelles',
    description: 'Programme bruxellois de primes à la rénovation durable. Jusqu\'à 12 000 €.',
    max_amount: 12000,
    url: 'https://renolution.brussels/',
    color: 'orange',
  },
  {
    id: 'fla_renov_1',
    regions: ['flandre'],
    keywords: ['rénovation', 'peinture', 'plafond', 'carrelage', 'parquet', 'menuisier', 'menuiserie', 'renovatie'],
    name: 'Mijn VerbouwPremie — Renovatie',
    description: 'Vlaamse premie voor grondige renovatie. Tot 10 000 €.',
    max_amount: 10000,
    url: 'https://www.vlaanderen.be/mijn-verbouwpremie',
    color: 'orange',
  },
];

export const REGIONS = [
  { id: 'bruxelles', label_fr: 'Bruxelles-Capitale', label_nl: 'Brussels Hoofdstedelijk', label_de: 'Brüssel' },
  { id: 'wallonie', label_fr: 'Wallonie', label_nl: 'Wallonië', label_de: 'Wallonien' },
  { id: 'flandre', label_fr: 'Flandre', label_nl: 'Vlaanderen', label_de: 'Flandern' },
];

export function getSubsidies(categoryName, region) {
  if (!categoryName || !region) return [];
  const lc = categoryName.toLowerCase();
  return SUBSIDIES.filter(s =>
    s.regions.includes(region) &&
    s.keywords.some(k => lc.includes(k))
  );
}