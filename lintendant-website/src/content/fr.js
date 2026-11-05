// Contenu français (langue principale). *texte* = mot en gras dans les titres.
// Les slogans du héros et les textes « Pilier de confiance » et
// « Nos réalisations » reprennent mot pour mot l'ancien site; les sections
// Approche, Services, À propos et Carrières sont rédigées à partir des pages
// d'origine.

export default {
  lang: "fr-CA",
  ogLocale: "fr_CA",
  path: "/",
  alt: { path: "/en/", short: "EN", name: "English", lang: "en-CA" },

  meta: {
    title: "L'Intendant | Gestionnaire de projets et constructeur",
    description:
      "Gestion de projet, gérance de construction, clé en main ou forfait : L'Intendant bâtit vos projets commerciaux, institutionnels, hôteliers et résidentiels avec une approche 360° et une équation coût-temps-performance optimale.",
  },

  ids: { trust: "confiance", approach: "approche", services: "services", projects: "realisations", about: "a-propos", careers: "carrieres", contact: "contact" },

  ui: {
    skip: "Aller au contenu",
    menu: "Menu",
    close: "Fermer",
    pause: "Mettre le diaporama en pause",
    play: "Relancer le diaporama",
    prev: "Précédent",
    next: "Suivant",
    drag: "Glisser",
    backToTop: "Haut de page",
    project: "Projet",
    view: "Voir le projet",
    of: "sur",
  },

  header: {
    tagline: ["*Gestionnaire* de projets", "et constructeur"],
    nav: [
      { key: "approach", label: "Approche" },
      { key: "services", label: "Services", mega: "services" },
      { key: "projects", label: "Réalisations", mega: "projects" },
      { key: "about", label: "À propos" },
      { key: "careers", label: "Carrières" },
    ],
    cta: "Nous joindre",
    megaServices: {
      title: "Trois formules efficaces. Une approche éprouvée.",
      more: "Notre approche 360°",
    },
    megaProjects: {
      title: "Explorer par secteur",
      all: "Tous nos projets",
    },
  },

  hero: {
    h1: "Gestionnaire de projets et constructeur",
    slides: [
      { lines: ["Le visage de", "la *compétence*."], cta: "Découvrez la culture d'engagement de notre équipe", target: "about" },
      { lines: ["Vision de gestion.", "*Expérience terrain.*"], cta: "Découvrez nos 3 formules de services", target: "services" },
      { lines: ["La tête dans votre projet.", "*Les pieds sur terre.*"], cta: "Découvrez notre approche 360°", target: "approach" },
      { lines: ["Pilier de", "*confiance*."], cta: "Une équation coût-temps-performance optimale", target: "trust" },
    ],
    panelTitle: "Par où commencer ?",
    options: [
      { title: "Bâtir un projet", text: "Gestion de projet, gérance, clé en main ou forfait : trouvons ensemble la bonne formule.", target: "contact" },
      { title: "Notre approche 360°", text: "De la préfaisabilité à la livraison, rien n'est laissé au hasard.", target: "approach" },
      { title: "Nos réalisations", text: "77 projets dans 6 secteurs d'activité, partout au Québec.", target: "projects" },
      { title: "Une carrière", text: "Des projets stimulants et une équipe engagée. Joignez-vous à nous.", target: "careers" },
    ],
    scroll: "Défiler",
  },

  marqueeLabel: "Quelques clients de L'Intendant",

  trust: {
    eyebrow: "Pilier de confiance",
    statement:
      "Le coût, le temps et la performance sont trois variables indissociables dans la réussite d'un projet de construction.",
    body:
      "Quels que soient le budget, les contraintes d'échéancier, les performances du bâtiment requises et la complexité du design architectural, nous bâtissons chaque projet sans jamais perdre de vue ces trois piliers.",
    equation: [
      { term: "Coût", text: "Un budget maîtrisé, de l'estimation à la dernière facture." },
      { term: "Temps", text: "Des échéanciers planifiés, suivis et respectés." },
      { term: "Performance", text: "Un bâtiment à la hauteur des exigences, sans les dépasser." },
    ],
    result: { term: "Réussite", text: "Une équation coût-temps-performance optimale." },
    cta: "Découvrir notre approche",
  },

  approach: {
    eyebrow: "Notre approche",
    title: "360° *d'expérience*",
    lead: "Des constructeurs d'expérience avec une vision de gestion globale.",
    body:
      "Notre équipe gère chaque aspect d'un projet de construction selon une perspective à 360 degrés. Vous profitez d'une vue d'ensemble complète du projet et de conseils d'experts sur les questions les plus techniques. Cette combinaison d'une approche globale et d'une connaissance approfondie du terrain vous permet d'anticiper les obstacles et de respecter échéanciers, budgets et exigences techniques.",
    columns: { financial: "Financier", administrative: "Administratif", technical: "Technique" },
    phases: [
      {
        name: "Préfaisabilité",
        text: "L'analyse de la faisabilité du projet sous tous ses angles, pour ne rien laisser au hasard.",
        financial: ["Analyse de préfaisabilité du projet de construction", "Budget préliminaire nécessaire à la réalisation du projet"],
        administrative: [
          "Représentation du client dans ses démarches de modification de zonage",
          "Recommandations d'experts pour la gestion de l'acceptabilité sociale",
          "Obtention des permis et des assurances",
        ],
        technical: [
          "Analyse des besoins propres au projet",
          "Soutien à l'élaboration du concept",
          "Définition du projet, de ses paramètres et de ses exigences techniques",
          "Optimisation des méthodes de conception et de construction",
          "Conseils et accompagnement du client",
        ],
      },
      {
        name: "Conception",
        text: "La détermination précise des exigences techniques et la préparation des plans et devis.",
        financial: [
          "Ajustements budgétaires selon les plans et devis définitifs",
          "Optimisation des solutions retenues",
          "Établissement des budgets préliminaires",
        ],
        administrative: [
          "Gestion des appels de propositions auprès des fournisseurs",
          "Administration des contrats avec les entrepreneurs spécialisés",
        ],
        technical: [
          "Sélection des firmes d'architectes et d'ingénieurs",
          "Approbation des plans et des soumissions",
          "Choix et optimisation des matériaux",
          "Rédaction du devis",
          "Sélection des entrepreneurs spécialisés",
          "Planification des étapes et de l'échéancier de construction",
          "Conseils et accompagnement sur les aspects techniques",
        ],
      },
      {
        name: "Construction",
        text: "La gestion de la phase de construction, la supervision du chantier et l'exécution des travaux.",
        financial: ["Suivi budgétaire rigoureux", "Mise à jour et préparation de la facturation"],
        administrative: [],
        technical: [
          "Planification des échéanciers de construction",
          "Coordination et supervision des entrepreneurs spécialisés",
          "Services techniques et administratifs liés à la gestion de la construction",
          "Contrôle de la qualité sur le chantier pendant les travaux",
          "Supervision et gestion du chantier",
          "Exécution des travaux de construction",
          "Inspection et vérification de la conformité des travaux",
          "Application des lois et normes de la CNESST",
        ],
      },
    ],
    note: "Nous pouvons assumer une partie ou la totalité de ces responsabilités.",
  },

  services: {
    eyebrow: "Nos services",
    title: "Une adaptabilité *rentable*",
    lead:
      "Nous pouvons gérer votre projet du début à la fin, ou vous accompagner en formule clé en main ou en gérance de construction. Quelle que soit la formule choisie, nous veillons à ce que notre intervention vous soit la plus profitable possible et complète parfaitement les équipes multidisciplinaires en place.",
    sub: ["Trois formules efficaces.", "Et une approche éprouvée *des centaines de fois*."],
    items: [
      {
        name: "Gérance de construction",
        tagline: "Toute la rigueur d'un constructeur d'expérience dans la réalisation des travaux.",
        text: "Plus nous intervenons tôt dans le processus, plus le projet profite de notre expérience et de nos méthodes éprouvées. Notre équipe devient rapidement un atout pour vous.",
        points: [
          "Collaboration étroite avec les architectes et ingénieurs retenus",
          "Accompagnement en phase de construction, notamment la planification et la supervision",
          "Suivi serré des échéanciers, des coûts et des exigences techniques",
          "Une approche fondée sur les meilleures pratiques en construction",
          "Un processus rigoureux et éprouvé, en pleine conformité avec les normes et les exigences du projet",
        ],
      },
      {
        name: "Clé en main",
        tagline: "Le meilleur de notre expérience dans toutes les dimensions de la conception et de la construction.",
        text: "Nous livrons un projet complet à coût fixe. En collaboration avec vous ou un tiers, nous gérons votre projet de la conception à la construction.",
        points: [
          "Définition des besoins et gestion de toutes les étapes de conception et de construction",
          "Conseils sur les exigences techniques pendant la conception",
          "Sélection des architectes, ingénieurs et entrepreneurs spécialisés",
          "Coordination efficace du chantier dans le respect des normes du bâtiment et des exigences de votre projet",
          "Inspection des travaux et assurance qualité",
        ],
      },
      {
        name: "Gestion de projet",
        tagline: "Une équipe solide pour orchestrer l'ensemble des travaux avec efficacité et maîtrise.",
        text: "Nous jouons un rôle pivot à tous les niveaux, dans une formule de partage des risques où nous sommes liés par le succès. Nous définissons la meilleure équation coût-temps-performance.",
        points: [
          "Orchestration de l'ensemble des travaux : études de préfaisabilité, conception et construction du bâtiment",
          "Fonctions additionnelles en amont : recherche de terrain, négociation, financement des travaux, sélection des professionnels et des entrepreneurs spécialisés",
          "Un leadership proactif qui assure le respect des exigences de votre projet et défend vos intérêts",
          "Votre projet devient notre projet : les décisions sont prises rapidement pour le faire avancer",
        ],
      },
      {
        name: "Contrat à forfait",
        option: true,
        tagline: "La tranquillité d'esprit de connaître d'avance le coût final de votre projet.",
        text: "Les projets dont nous maîtrisons tous les détails peuvent être réalisés à forfait. Nous nous engageons alors à exécuter les travaux de la phase de construction pour un prix fixe et ferme, établi selon les plans et devis produits par votre équipe de professionnels.",
        points: ["Prix fixe et ferme pour la phase de construction", "Coûts établis selon vos plans et devis", "Un seul interlocuteur responsable de l'exécution"],
      },
    ],
    note: "Nous pouvons aussi vous accompagner en mode *maintien d'actifs*.",
    motto: "Les meilleurs s'entourent des meilleurs.",
    cta: "Discuter de votre projet",
  },

  stats: [
    { value: 77, label: "réalisations en vitrine" },
    { value: 6, label: "secteurs d'activité" },
    { value: 3, label: "formules de services" },
    { value: 360, suffix: "°", label: "de vision de gestion" },
  ],

  sectors: {
    restauration: "Restauration",
    commerce: "Commerce & distribution",
    bureaux: "Bureaux & gouvernement",
    sante: "Santé & bien-être",
    specialise: "Constructions spécialisées",
    hotellerie: "Hôtellerie & résidentiel",
  },

  projects: {
    eyebrow: "Nos réalisations",
    title: "Nos projets *récents*",
    lead:
      "Chez L'Intendant, nous transformons chaque vision de nos clients en réalité concrète. Notre expertise couvre une gamme diverse et étendue de secteurs, témoignant à chaque fois de notre engagement pour l'excellence.",
    allTitle: "Tous *nos projets*",
    allLead:
      "Explorez la richesse et la diversité de nos réalisations. Parcourez notre portfolio pour découvrir l'étendue de notre expertise et les nombreux défis que nous avons relevés avec succès.",
    all: "Tous",
    more: "Afficher plus de projets",
    filterLabel: "Filtrer par secteur",
  },

  about: {
    eyebrow: "À propos",
    title: "Plus qu'un *constructeur d'expérience*.",
    lead: "Nous sommes le pilier sur lequel vous pouvez compter pour mener à bien tous vos projets de construction.",
    body:
      "L'efficacité est une priorité. Quels que soient le budget, les exigences de performance du bâtiment ou la complexité du design architectural, nous veillons à ce que chaque projet atteigne un équilibre optimal entre coût, temps et performance. Pour y arriver, nous visons les plus hautes normes, sans jamais dépasser vos besoins.",
    pillars: [
      { title: "Approche 360°", text: "Une vue d'ensemble du projet, de la préfaisabilité à la livraison." },
      { title: "Adaptabilité", text: "La formule qui convient à votre projet, et non l'inverse." },
      { title: "Culture d'engagement", text: "Une équipe qui fait de votre projet son projet." },
    ],
    closing: "Bâtissez sur des bases solides.",
    cta: "Nous joindre",
  },

  careers: {
    eyebrow: "Carrières",
    title: "Notre entreprise souhaite *agrandir son équipe*.",
    lead: "Vous cherchez des projets stimulants et pleins de défis ?",
    listTitle: "Voici nos postes disponibles",
    apply: "Postuler",
    subject: "Candidature",
    positions: [
      "Adjoint de projet",
      "Estimateur adjoint",
      "Chargé de projet",
      "Charpentiers-menuisiers",
      "Conseiller en gestion des ressources humaines",
      "Conseiller en santé et sécurité",
      "Coordonnateur des équipements",
      "Coordonnateur de projet",
      "Coordonnateur en santé et sécurité",
      "Directeur de construction",
      "Directeur du développement",
      "Estimateur en construction",
      "Surintendant de chantier",
    ],
    footnote: "*Le masculin est utilisé dans ce texte dans le seul but d'alléger la lecture.",
    openTitle: "Candidatures spontanées bienvenues !",
    openText:
      "Comptable, chargé de projet, estimateur, contremaître… Vous pensez être un atout pour l'équipe de L'Intendant ? Faites-nous parvenir votre CV.",
    openCta: "Envoyer mon CV",
  },

  contact: {
    eyebrow: "Nous joindre",
    title: "Bâtissons votre *prochain projet*.",
    lead: "Parlez-nous de votre projet : budget, échéancier, exigences. Notre équipe vous répondra pour trouver la formule qui vous convient.",
    emailLabel: "Courriel",
    careersLabel: "Candidatures",
    form: {
      name: "Nom complet",
      company: "Entreprise",
      email: "Courriel",
      phone: "Téléphone (facultatif)",
      sector: "Type de projet",
      formula: "Formule envisagée",
      formulaOptions: ["Gestion de projet", "Gérance de construction", "Clé en main", "Contrat à forfait", "À déterminer"],
      sectorOther: "Autre",
      choose: "Choisir…",
      message: "Votre projet",
      submit: "Envoyer",
      sending: "Envoi…",
      subject: "Projet",
      mailtoNote: "Votre logiciel de courriel s'ouvrira avec votre message prêt à envoyer.",
      success: "Merci ! Votre message a bien été envoyé. Notre équipe communiquera avec vous sous peu.",
      error: "L'envoi a échoué. Écrivez-nous directement à",
      required: "Champ requis",
      invalidEmail: "Courriel invalide",
    },
  },

  footer: {
    tagline: "Gestionnaire de projets et constructeur",
    navTitle: "Explorer",
    servicesTitle: "Services",
    contactTitle: "Nous joindre",
    rights: "Tous droits réservés.",
  },
}
