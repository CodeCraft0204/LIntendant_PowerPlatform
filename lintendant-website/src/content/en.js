// English content. *text* = bold word in headings. Mirrors src/content/fr.js
// key for key; the company name is never translated.

export default {
  lang: "en-CA",
  ogLocale: "en_CA",
  path: "/en/",
  alt: { path: "/", short: "FR", name: "Français", lang: "fr-CA" },

  meta: {
    title: "L'Intendant | Project manager and builder",
    description:
      "Project management, construction management, turnkey or fixed-price: L'Intendant builds commercial, institutional, hospitality and residential projects with a 360° approach and an optimal cost-time-performance equation.",
  },

  ids: { trust: "trust", approach: "approach", services: "services", projects: "projects", about: "about", careers: "careers", contact: "contact" },

  ui: {
    skip: "Skip to content",
    menu: "Menu",
    close: "Close",
    pause: "Pause the slideshow",
    play: "Play the slideshow",
    prev: "Previous",
    next: "Next",
    drag: "Drag",
    backToTop: "Back to top",
    project: "Project",
    view: "View project",
    of: "of",
  },

  header: {
    tagline: ["*Project manager*", "and builder"],
    nav: [
      { key: "approach", label: "Approach" },
      { key: "services", label: "Services", mega: "services" },
      { key: "projects", label: "Projects", mega: "projects" },
      { key: "about", label: "About" },
      { key: "careers", label: "Careers" },
    ],
    cta: "Contact us",
    megaServices: {
      title: "Three effective formulas. One proven approach.",
      more: "Our 360° approach",
    },
    megaProjects: {
      title: "Explore by sector",
      all: "All projects",
    },
  },

  hero: {
    h1: "Project manager and builder",
    slides: [
      { lines: ["The face of", "*competence*."], cta: "Discover our team's culture of commitment", target: "about" },
      { lines: ["Management vision.", "*Field experience.*"], cta: "Discover our 3 service formulas", target: "services" },
      { lines: ["Head in your project.", "*Feet on the ground.*"], cta: "Discover our 360° approach", target: "approach" },
      { lines: ["A pillar of", "*trust*."], cta: "An optimal cost-time-performance equation", target: "trust" },
    ],
    panelTitle: "Where do we start?",
    options: [
      { title: "Build a project", text: "Project management, construction management, turnkey or fixed-price: let's find the right formula.", target: "contact" },
      { title: "Our 360° approach", text: "From pre-feasibility to handover, nothing is left to chance.", target: "approach" },
      { title: "Our projects", text: "77 projects across 6 sectors, all over Québec.", target: "projects" },
      { title: "A career", text: "Challenging projects and a committed team. Join us.", target: "careers" },
    ],
    scroll: "Scroll",
  },

  marqueeLabel: "Some of L'Intendant's clients",

  trust: {
    eyebrow: "A pillar of trust",
    statement: "Cost, time and performance are three inseparable variables in the success of a construction project.",
    body:
      "Whatever the budget, the schedule constraints, the required building performance or the complexity of the architectural design, we build every project without ever losing sight of these three pillars.",
    equation: [
      { term: "Cost", text: "A budget under control, from estimate to final invoice." },
      { term: "Time", text: "Schedules that are planned, tracked and met." },
      { term: "Performance", text: "A building that meets the requirements without exceeding them." },
    ],
    result: { term: "Success", text: "An optimal cost-time-performance equation." },
    cta: "Discover our approach",
  },

  approach: {
    eyebrow: "Our approach",
    title: "360° *of experience*",
    lead: "Experienced builders with a global management vision.",
    body:
      "Our team manages every aspect of a construction project from a 360-degree perspective. You get a complete overview of the project and expert advice on the most technical questions. This combination of a holistic approach and deep field knowledge helps you anticipate obstacles and meet schedules, budgets and technical requirements.",
    columns: { financial: "Financial", administrative: "Administrative", technical: "Technical" },
    phases: [
      {
        name: "Pre-feasibility",
        text: "Analyzing the project's feasibility from every angle, so nothing is left to chance.",
        financial: ["Pre-feasibility analysis of the construction project", "Preliminary budget required to carry out the project"],
        administrative: [
          "Representing the client in zoning amendment procedures",
          "Expert recommendations on social acceptability",
          "Obtaining permits and insurance",
        ],
        technical: [
          "Analysis of the project's specific needs",
          "Support in developing the concept",
          "Definition of the project, its parameters and technical requirements",
          "Optimization of design and construction methods",
          "Advice and support for the client",
        ],
      },
      {
        name: "Design",
        text: "Precisely defining the technical requirements and preparing plans and specifications.",
        financial: [
          "Budget adjustments based on final plans and specifications",
          "Optimization of the selected solutions",
          "Preparation of preliminary budgets",
        ],
        administrative: ["Managing calls for proposals with suppliers", "Contract administration with specialty contractors"],
        technical: [
          "Selection of architecture and engineering firms",
          "Approval of plans and bids",
          "Selection and optimization of materials",
          "Drafting the specifications",
          "Selection of specialty contractors",
          "Planning of construction phases and schedule",
          "Advice and support on technical matters",
        ],
      },
      {
        name: "Construction",
        text: "Managing the construction phase, supervising the site and carrying out the work.",
        financial: ["Rigorous budget tracking", "Updating and preparing invoicing"],
        administrative: [],
        technical: [
          "Planning construction schedules",
          "Coordination and supervision of specialty contractors",
          "Technical and administrative services for construction management",
          "On-site quality control during the work",
          "Site supervision and management",
          "Execution of the construction work",
          "Inspection and verification of compliance",
          "Application of CNESST laws and standards",
        ],
      },
    ],
    note: "We can take on some or all of these responsibilities.",
  },

  services: {
    eyebrow: "Our services",
    title: "Profitable *adaptability*",
    lead:
      "We can manage your project from start to finish, or support you with a turnkey or construction management approach. Whichever formula you choose, we make sure our involvement is as profitable as possible for you and perfectly complements the multidisciplinary teams in place.",
    sub: ["Three effective formulas.", "And an approach proven *hundreds of times*."],
    items: [
      {
        name: "Construction management",
        tagline: "All the rigour of an experienced builder in carrying out the work.",
        text: "The earlier we get involved, the more the project benefits from our experience and proven methods. Our team quickly becomes an asset for you.",
        points: [
          "Close collaboration with the selected architects and engineers",
          "Support during construction, including planning and supervision",
          "Tight monitoring of schedules, costs and technical requirements",
          "An approach based on construction best practices",
          "A rigorous, proven process ensuring full compliance with standards and project requirements",
        ],
      },
      {
        name: "Turnkey",
        tagline: "The best of our experience across every dimension of design and construction.",
        text: "We deliver a complete project at a fixed cost. Working with you or a third party, we manage your project from design to construction.",
        points: [
          "Defining needs and managing every design and construction step",
          "Advice on technical requirements during design",
          "Selection of architects, engineers and specialty contractors",
          "Efficient site coordination that meets building codes and your project's requirements",
          "Inspection of the work and quality assurance",
        ],
      },
      {
        name: "Project management",
        tagline: "A strong team to orchestrate all the work with efficiency and mastery.",
        text: "We play a pivotal role at every level, in a risk-sharing formula where we are bound by success. We define the best cost-time-performance equation.",
        points: [
          "Orchestration of all the work: pre-feasibility studies, design and construction of the building",
          "Optional upstream services: site search, negotiation, project financing, selection of professionals and specialty contractors",
          "Proactive leadership that enforces your project's requirements and defends your interests",
          "Your project becomes our project: decisions are made quickly to keep it moving",
        ],
      },
      {
        name: "Fixed-price contract",
        option: true,
        tagline: "The peace of mind of knowing your project's final cost in advance.",
        text: "Projects whose details we fully understand can be delivered under a fixed-price contract. We then commit to carrying out the construction phase for a firm, fixed price, based on the plans and specifications produced by your team of professionals.",
        points: ["Firm, fixed price for the construction phase", "Costs based on your plans and specifications", "A single party accountable for execution"],
      },
    ],
    note: "We can also support you in *asset maintenance* mode.",
    motto: "The best surround themselves with the best.",
    cta: "Discuss your project",
  },

  stats: [
    { value: 77, label: "featured projects" },
    { value: 6, label: "business sectors" },
    { value: 3, label: "service formulas" },
    { value: 360, suffix: "°", label: "management vision" },
  ],

  sectors: {
    restauration: "Restaurants",
    commerce: "Retail & distribution",
    bureaux: "Offices & government",
    sante: "Health & wellness",
    specialise: "Specialized construction",
    hotellerie: "Hospitality & residential",
  },

  projects: {
    eyebrow: "Our projects",
    title: "Recent *projects*",
    lead:
      "At L'Intendant, we turn each client's vision into concrete reality. Our expertise spans a wide and diverse range of sectors, each time reflecting our commitment to excellence.",
    allTitle: "All *our projects*",
    allLead:
      "Explore the richness and diversity of our work. Browse our portfolio to discover the breadth of our expertise and the many challenges we have successfully met.",
    all: "All",
    more: "Show more projects",
    filterLabel: "Filter by sector",
  },

  about: {
    eyebrow: "About",
    title: "More than an *experienced builder*.",
    lead: "We are the pillar you can rely on to successfully complete all your construction projects.",
    body:
      "Efficiency is a priority. Whatever the budget, the building performance requirements or the complexity of the architectural design, we make sure every project reaches an optimal balance of cost, time and performance. To get there, we aim for the highest standards without ever exceeding your needs.",
    pillars: [
      { title: "360° approach", text: "A full view of the project, from pre-feasibility to handover." },
      { title: "Adaptability", text: "The formula that fits your project, not the other way around." },
      { title: "Culture of commitment", text: "A team that makes your project its own." },
    ],
    closing: "Build on solid ground.",
    cta: "Contact us",
  },

  careers: {
    eyebrow: "Careers",
    title: "Our company is looking to *grow its team*.",
    lead: "Looking for stimulating, challenging projects?",
    listTitle: "Our open positions",
    apply: "Apply",
    subject: "Application",
    positions: [
      "Project Assistant",
      "Assistant Estimator",
      "Project Manager",
      "Carpenters and Joiners",
      "HR Management Advisor",
      "Health and Safety Advisor",
      "Equipment Coordinator",
      "Project Coordinator",
      "Health and Safety Coordinator",
      "Construction Manager",
      "Development Director",
      "Construction Estimator",
      "Site Superintendent",
    ],
    footnote: "",
    openTitle: "Unsolicited applications welcome!",
    openText:
      "Accountant, project manager, estimator, foreman… Think you'd be an asset to the L'Intendant team? Send us your resume.",
    openCta: "Send my resume",
  },

  contact: {
    eyebrow: "Contact us",
    title: "Let's build your *next project*.",
    lead: "Tell us about your project: budget, schedule, requirements. Our team will get back to you to find the formula that fits.",
    emailLabel: "Email",
    careersLabel: "Applications",
    form: {
      name: "Full name",
      company: "Company",
      email: "Email",
      phone: "Phone (optional)",
      sector: "Project type",
      formula: "Preferred formula",
      formulaOptions: ["Project management", "Construction management", "Turnkey", "Fixed-price contract", "To be determined"],
      sectorOther: "Other",
      choose: "Choose…",
      message: "Your project",
      submit: "Send",
      sending: "Sending…",
      subject: "Project",
      mailtoNote: "Your email app will open with your message ready to send.",
      success: "Thank you! Your message has been sent. Our team will be in touch shortly.",
      error: "Sending failed. Email us directly at",
      required: "Required",
      invalidEmail: "Invalid email",
    },
  },

  footer: {
    tagline: "Project manager and builder",
    navTitle: "Explore",
    servicesTitle: "Services",
    contactTitle: "Contact",
    rights: "All rights reserved.",
  },
}
