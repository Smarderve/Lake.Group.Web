#!/usr/bin/env node
/**
 * Wire leadership listing + profile pages with data-i18n, add full
 * en/fr/sw/hi/ar translations, regenerate i18n-content.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');

const HQ_ADDR =
  'Plot 49, Mikocheni Light Industrial Area, P.O. Box 5055, Dar es Salaam, Tanzania';

/** @type {Record<string, Record<string, string>>} */
const NEW = {
  en: {
    'leadership.57': 'Read more',
    'leadership.58': 'All leadership',
    'leadership.59': 'Group HQ',
    'leadership.60': 'Phone',
    'leadership.61': 'Email',
    'leadership.62': 'About Lake Group',
    'leadership.63': 'Our companies',
    'leadership.64': 'Contact',
    'leadership.65': 'Meet the full team',
    'leadership.66': 'Our history',
    'leadership.67': 'Contact Group HQ',
    'leadership.68': 'Fleet profile',
    'leadership.69': 'Our fleet',
    'leadership.70': 'Africa network',
    'leadership.71': 'Major projects',
    'leadership.72': 'Container services',
    'leadership.73': 'Contact Group',
    'leadership.74': 'Logistics',
    'leadership.75': 'Operations',
    'leadership.76': 'Manufacturing',
    'leadership.77': 'Technology',
    'leadership.78': 'Finance · Containers',
    'leadership.79': 'Agro Processing',
    'leadership.80': 'Focus',
    'leadership.81': 'Scope',
    'leadership.82': 'Group-wide',
    'leadership.83': 'HQ',
    'leadership.84': 'Dar es Salaam',
    'leadership.85': 'Founded',
    'leadership.86': 'Countries',
    'leadership.87': 'People',
    'leadership.88': 'Unit',
    'leadership.89': 'Projects',
    'leadership.90': 'Type',
    'leadership.91': 'Greenfield / Agro',
    'leadership.92': 'Logistics unit',
    'leadership.93': 'Group trucks',
    'leadership.94': 'Corridor countries',
    'leadership.95': 'TEU capacity (Dar)',
    'leadership.96': 'Depot location',
    'leadership.97': 'Country sites',
    'leadership.98': 'Core ERP',
    'leadership.99': 'Logistics systems',
    'leadership.100': 'Security scope',
    'leadership.101': 'Steel technology',
    'leadership.102': 'Annual capacity',
    'leadership.103': 'Mill location',
    'leadership.104':
      'Forbes-featured entrepreneur who founded Lake Oil in 2006 and built Lake Group into one of East and Central Africa’s leading energy, logistics and industrial conglomerates.',
    'leadership.105':
      'Leads Lake Group’s structural industrial expansions - most notably Lake Steel - spanning production infrastructure, manufacturing output, concrete products and construction supply networks.',
    'leadership.106':
      'Owns enterprise technology architecture and digital strategy - from centralised SAP environments to logistics intelligence and cross-border data security.',
    'leadership.107':
      'Directs Associated Trans Logistics Ltd (ATL), operating alongside Lake Trans as a logistical backbone for fuel fleets, heavy haulage and multi-national cargo corridors.',
    'leadership.108':
      'Oversees financial planning, risk analysis and corporate governance for African Inland Container Depot (AFICD) - Lake Group’s dry-port platform in Dar es Salaam.',
    'leadership.109': HQ_ADDR,
    // Ally body
    'leadership.110':
      'Born in 1980 into a family of traders, Awadh studied Business Administration at Brock University in Canada - supporting himself with odd jobs while building early trading instincts. By his mid-20s he had already moved into truck refurbishing and commodity trading. In 2006 he launched Lake Oil; official Group materials place him at 27 at founding.',
    'leadership.111':
      'His oversight today spans oil marketing, supply chain, downstream logistics and heavy industrial manufacturing across Tanzania, Kenya, Zambia, DRC, Burundi and Rwanda - with wider Group presence also in Ethiopia, Mozambique and Dubai (MERM). Under his chairmanship the Group has grown retail networks (85 stations in Tanzania alone), storage infrastructure, a 700+ truck fleet, LPG terminals, Lake Steel, ready-mix concrete and AFICD port-extension services.',
    'leadership.112':
      'In 2017 Forbes covered Lake Oil Group’s regional push - including Competition Authority of Kenya approval to acquire Hashi Energy’s Kenyan station network - and described the enterprise as a billion-dollar (revenue) integrated energy platform. Awadh has also been recognised by African Leadership Magazine (Young Business Leader of the Year, 2022) and as Young African Energy Leader of the Year (African Business Leadership Awards, 2023).',
    'leadership.113':
      '“With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace.”',
    'leadership.114': 'Group strategy across energy, logistics and industry',
    'leadership.115': 'Regional expansion and capital partnerships',
    'leadership.116': 'Governance and long-term value creation',
    // Dileep Kumar
    'leadership.117':
      'As Manufacturing CEO, Dileep Kumar’s mandate sits at the industrial heart of the Group’s diversification beyond petroleum. Lake Steel operates a computerized automatic rolling mill at Visiga, Kibaha (Plot 118, Block M), with throughput up to about 25 tonnes/hour and annual capacity around 100,000 MT - with publicly discussed expansion toward 150,000 MT.',
    'leadership.118':
      'The mill introduced high-strength corrosion-resistant (HS-CR) rebar to Tanzania, engineered to retain strength at elevated temperatures and deliver markedly higher corrosion resistance than ordinary rebar.',
    'leadership.119':
      'His portfolio also connects to the Group’s construction-materials chain: Gulf Aggregates crushing plants, Lake Premix / GCCP ready-mix operations in Dar es Salaam, and the wider building-products ecosystem that supplies contractors and infrastructure projects.',
    'leadership.120': 'Lake Steel production infrastructure & mill output',
    'leadership.121': 'Concrete products & construction supply networks',
    'leadership.122': 'Industrial expansion programmes across manufacturing units',
    // Sridhar Mani
    'leadership.123':
      'Across a Group that runs fuel depots, 700+ trucks, ICD/CFS yards and multi-country retail, digital systems are the nervous system. Mani’s mandate focuses on optimising Lake Group’s centralised SAP stack - the operational backbone for shipment orders, inventory and financial posting across units such as Lake Trans and AFICD.',
    'leadership.124':
      'He embeds custom logistics and fleet-tracking intelligence so corridor movements stay visible from Dar to Ndola and beyond, and scales cross-border data security infrastructure protecting networks that connect Tanzania hubs with regional country operations.',
    'leadership.125':
      'The goal is a single, resilient digital layer that lets manufacturing, energy and logistics executives act on the same real-time picture.',
    'leadership.126': 'Centralised SAP optimisation & enterprise architecture',
    'leadership.127': 'Fleet tracking & logistics intelligence',
    'leadership.128': 'Cross-border cybersecurity & data infrastructure',
    // Mohammed Khalid
    'leadership.129':
      'Khalid’s ATL wing sits next to Lake Trans Ltd. - the Group’s second company (2008) and primary petroleum haulage arm. Together they move product locally and in transit across Tanzania, Zambia, Rwanda, DRC, Burundi, Malawi, Kenya and Uganda.',
    'leadership.130':
      'Group messaging cites 700+ trucks; tanker capacities typically range 12,000–40,000 litres, with GPS tracking as standard. Workshops in Kibaha, Kigamboni, Morogoro, Nairobi and Ndola support asset uptime on the corridors that make Lake Group’s multi-country model possible.',
    'leadership.131':
      'ATL’s role is to keep the physical network seamless: routing fuel fleets, heavy haulage and cargo pipelines so depots, stations and industrial plants stay supplied.',
    'leadership.132': 'Fuel distribution fleet routing & execution',
    'leadership.133': 'Heavy haulage & multi-national cargo pipelines',
    'leadership.134': 'Coordination with Lake Trans corridor operations',
    // Bibhuti Singh
    'leadership.135':
      'AFICD is a core Group asset: an inland container depot at Tazara / Pugu Road with rail siding toward the port (~6 km), serving landlocked markets including Rwanda, Burundi, Uganda, DRC, Zambia and Malawi.',
    'leadership.136':
      'The Dar yard covers about 14,000 m² with capacity around 4,000 TEU, SAP-based operations, container repairs, and sister sites in Zambia (Ndola) and Mozambique (Beira). ACFS extends the brand into a larger CFS terminal with warehouse, weighbridge and reefer capacity.',
    'leadership.137':
      'As CFO, Singh’s brief is capital discipline and governance around that cargo engine - planning, risk and controls for import-export volumes, customs-linked workflows and container clearing.',
    'leadership.138': 'Financial planning & performance for AFICD',
    'leadership.139': 'Risk analysis & corporate governance',
    'leadership.140': 'Support for ICD / CFS commercial operations',
    // Juma
    'leadership.141':
      'As Director of Operations, Nuru is responsible for aligning day-to-day execution across Lake Group’s operating companies so energy, logistics and industrial units deliver reliably against Group standards.',
    'leadership.142':
      'The role spans operational performance, coordination between business units, and continuous improvement of processes that keep depots, fleets, plants and commercial teams running as one organisation.',
    'leadership.143':
      'Working through Group HQ in Dar es Salaam, the operations desk supports country and unit leadership with clear priorities, escalation paths and performance visibility.',
    'leadership.144': 'Group-wide operational coordination',
    'leadership.145': 'Execution discipline across business units',
    'leadership.146': 'Performance monitoring and continuous improvement',
    // Nassoro
    'leadership.147':
      'Nassoro Abubakari leads project delivery for Lake Agro, the Group’s agribusiness and greenfield development arm.',
    'leadership.148':
      'The mandate covers planning and execution of agro programmes, coordination with Group support functions, and keeping delivery timelines aligned with commercial and operational goals.',
    'leadership.149':
      'Lake Agro sits within Lake Group’s wider diversification strategy - extending the organisation’s capabilities beyond energy and logistics into agriculture-linked development.',
    'leadership.150': 'Lake Agro project planning & delivery',
    'leadership.151': 'Greenfield and agribusiness programme coordination',
    'leadership.152': 'Stakeholder alignment with Group functions',
    'leadership.153': 'Multi-country',
    'leadership.16':
      'The executives driving Lake Group across energy, manufacturing, operations and agribusiness.'
  }
};

// French
NEW.fr = {
  'leadership.57': 'En savoir plus',
  'leadership.58': 'Toute la direction',
  'leadership.59': 'Siège du Groupe',
  'leadership.60': 'Téléphone',
  'leadership.61': 'E-mail',
  'leadership.62': 'À propos de Lake Group',
  'leadership.63': 'Nos sociétés',
  'leadership.64': 'Contact',
  'leadership.65': 'Rencontrez toute l’équipe',
  'leadership.66': 'Notre histoire',
  'leadership.67': 'Contacter le siège',
  'leadership.68': 'Profil de la flotte',
  'leadership.69': 'Notre flotte',
  'leadership.70': 'Réseau Afrique',
  'leadership.71': 'Grands projets',
  'leadership.72': 'Services conteneurs',
  'leadership.73': 'Contacter le Groupe',
  'leadership.74': 'Logistique',
  'leadership.75': 'Opérations',
  'leadership.76': 'Fabrication',
  'leadership.77': 'Technologie',
  'leadership.78': 'Finance · Conteneurs',
  'leadership.79': 'Agroalimentaire',
  'leadership.80': 'Focus',
  'leadership.81': 'Périmètre',
  'leadership.82': 'À l’échelle du Groupe',
  'leadership.83': 'Siège',
  'leadership.84': 'Dar es Salaam',
  'leadership.85': 'Fondé',
  'leadership.86': 'Pays',
  'leadership.87': 'Personnes',
  'leadership.88': 'Unité',
  'leadership.89': 'Projets',
  'leadership.90': 'Type',
  'leadership.91': 'Greenfield / Agro',
  'leadership.92': 'Unité logistique',
  'leadership.93': 'Camions du Groupe',
  'leadership.94': 'Pays de corridor',
  'leadership.95': 'Capacité EVP (Dar)',
  'leadership.96': 'Emplacement du dépôt',
  'leadership.97': 'Sites pays',
  'leadership.98': 'ERP central',
  'leadership.99': 'Systèmes logistiques',
  'leadership.100': 'Périmètre de sécurité',
  'leadership.101': 'Technologie acier',
  'leadership.102': 'Capacité annuelle',
  'leadership.103': 'Site de l’usine',
  'leadership.104':
    'Entrepreneur mis en avant par Forbes, fondateur de Lake Oil en 2006, qui a fait de Lake Group l’un des principaux conglomérats énergétiques, logistiques et industriels d’Afrique de l’Est et centrale.',
  'leadership.105':
    'Dirige les expansions industrielles structurelles de Lake Group - notamment Lake Steel - couvrant les infrastructures de production, la fabrication, les produits en béton et les réseaux d’approvisionnement construction.',
  'leadership.106':
    'Porte l’architecture technologique d’entreprise et la stratégie digitale - des environnements SAP centralisés à l’intelligence logistique et à la sécurité des données transfrontalières.',
  'leadership.107':
    'Dirige Associated Trans Logistics Ltd (ATL), aux côtés de Lake Trans, comme pilier logistique pour les flottes carburant, le transport lourd et les corridors de fret internationaux.',
  'leadership.108':
    'Supervise la planification financière, l’analyse des risques et la gouvernance d’African Inland Container Depot (AFICD) - la plateforme dry-port de Lake Group à Dar es Salaam.',
  'leadership.109': HQ_ADDR,
  'leadership.110':
    'Né en 1980 dans une famille de commerçants, Awadh a étudié l’administration des affaires à Brock University au Canada - en se finançant par des petits emplois tout en développant ses instincts commerciaux. Au milieu de la vingtaine, il s’était déjà lancé dans la remise en état de camions et le négoce de matières premières. En 2006, il a créé Lake Oil ; les documents officiels du Groupe indiquent qu’il avait 27 ans à la fondation.',
  'leadership.111':
    'Sa supervision couvre aujourd’hui le marketing pétrolier, la chaîne d’approvisionnement, la logistique aval et la fabrication industrielle lourde en Tanzanie, au Kenya, en Zambie, en RDC, au Burundi et au Rwanda - avec une présence plus large en Éthiopie, au Mozambique et à Dubaï (MERM). Sous sa présidence, le Groupe a développé les réseaux de stations (85 en Tanzanie seule), les infrastructures de stockage, une flotte de plus de 700 camions, des terminaux GPL, Lake Steel, le béton prêt à l’emploi et les services d’extension portuaire AFICD.',
  'leadership.112':
    'En 2017, Forbes a couvert l’expansion régionale de Lake Oil Group - notamment l’approbation de la Competition Authority of Kenya pour acquérir le réseau de stations kenyan de Hashi Energy - et a décrit l’entreprise comme une plateforme énergétique intégrée à chiffre d’affaires d’un milliard de dollars. Awadh a également été reconnu par African Leadership Magazine (Young Business Leader of the Year, 2022) et comme Young African Energy Leader of the Year (African Business Leadership Awards, 2023).',
  'leadership.113':
    '« Avec une équipe d’ingénieurs expérimentés et de professionnels dans toutes nos unités, Lake Group est pleinement équipé pour répondre aux exigences du marché mondial. »',
  'leadership.114': 'Stratégie du Groupe dans l’énergie, la logistique et l’industrie',
  'leadership.115': 'Expansion régionale et partenariats en capital',
  'leadership.116': 'Gouvernance et création de valeur à long terme',
  'leadership.117':
    'En tant que PDG Manufacturing, le mandat de Dileep Kumar se situe au cœur industriel de la diversification du Groupe au-delà du pétrole. Lake Steel exploite un laminoir automatique informatisé à Visiga, Kibaha (Plot 118, Block M), avec un débit jusqu’à environ 25 tonnes/heure et une capacité annuelle d’environ 100 000 TM - avec une expansion discutée publiquement vers 150 000 TM.',
  'leadership.118':
    'L’usine a introduit en Tanzanie le fer à béton HS-CR (haute résistance à la corrosion), conçu pour conserver sa résistance à des températures élevées et offrir une résistance à la corrosion nettement supérieure au fer à béton ordinaire.',
  'leadership.119':
    'Son portefeuille s’étend aussi à la chaîne des matériaux de construction du Groupe : usines de concassage Gulf Aggregates, opérations de béton prêt à l’emploi Lake Premix / GCCP à Dar es Salaam, et l’écosystème plus large des produits de construction qui alimente les entrepreneurs et les projets d’infrastructure.',
  'leadership.120': 'Infrastructures de production Lake Steel et sortie d’usine',
  'leadership.121': 'Produits en béton et réseaux d’approvisionnement construction',
  'leadership.122': 'Programmes d’expansion industrielle dans les unités de fabrication',
  'leadership.123':
    'Dans un Groupe qui gère des dépôts de carburant, plus de 700 camions, des yards ICD/CFS et un réseau de distribution multi-pays, les systèmes digitaux sont le système nerveux. Le mandat de Mani vise à optimiser la stack SAP centralisée de Lake Group - l’épine dorsale opérationnelle pour les commandes d’expédition, les stocks et la comptabilisation financière dans des unités telles que Lake Trans et AFICD.',
  'leadership.124':
    'Il intègre une intelligence logistique et de suivi de flotte sur mesure pour que les mouvements de corridor restent visibles de Dar à Ndola et au-delà, et déploie une infrastructure de sécurité des données transfrontalière protégeant les réseaux qui relient les hubs tanzaniens aux opérations nationales régionales.',
  'leadership.125':
    'L’objectif est une couche digitale unique et résiliente permettant aux dirigeants de la fabrication, de l’énergie et de la logistique d’agir sur la même vision en temps réel.',
  'leadership.126': 'Optimisation SAP centralisée et architecture d’entreprise',
  'leadership.127': 'Suivi de flotte et intelligence logistique',
  'leadership.128': 'Cybersécurité transfrontalière et infrastructure de données',
  'leadership.129':
    'L’aile ATL de Khalid côtoie Lake Trans Ltd. - la deuxième société du Groupe (2008) et bras principal de transport pétrolier. Ensemble, elles déplacent les produits localement et en transit à travers la Tanzanie, la Zambie, le Rwanda, la RDC, le Burundi, le Malawi, le Kenya et l’Ouganda.',
  'leadership.130':
    'Les messages du Groupe citent plus de 700 camions ; les capacités des citernes vont généralement de 12 000 à 40 000 litres, avec suivi GPS de série. Des ateliers à Kibaha, Kigamboni, Morogoro, Nairobi et Ndola soutiennent la disponibilité des actifs sur les corridors qui rendent possible le modèle multi-pays de Lake Group.',
  'leadership.131':
    'Le rôle d’ATL est de maintenir un réseau physique fluide : acheminement des flottes carburant, transport lourd et pipelines de fret afin que dépôts, stations et usines industrielles restent approvisionnés.',
  'leadership.132': 'Routage et exécution de la flotte de distribution carburant',
  'leadership.133': 'Transport lourd et pipelines de fret internationaux',
  'leadership.134': 'Coordination avec les opérations de corridor de Lake Trans',
  'leadership.135':
    'AFICD est un actif central du Groupe : un dépôt de conteneurs intérieur à Tazara / Pugu Road avec embranchement ferroviaire vers le port (~6 km), desservant des marchés enclavés dont le Rwanda, le Burundi, l’Ouganda, la RDC, la Zambie et le Malawi.',
  'leadership.136':
    'Le yard de Dar couvre environ 14 000 m² pour une capacité d’environ 4 000 EVP, des opérations sous SAP, des réparations de conteneurs, et des sites sœurs en Zambie (Ndola) et au Mozambique (Beira). ACFS étend la marque vers un terminal CFS plus grand avec entrepôt, pont-bascule et capacité frigorifique.',
  'leadership.137':
    'En tant que CFO, le mandat de Singh est la discipline du capital et la gouvernance autour de ce moteur de fret - planification, risques et contrôles pour les volumes import-export, les flux liés aux douanes et le dédouanement des conteneurs.',
  'leadership.138': 'Planification financière et performance pour AFICD',
  'leadership.139': 'Analyse des risques et gouvernance d’entreprise',
  'leadership.140': 'Soutien aux opérations commerciales ICD / CFS',
  'leadership.141':
    'En tant que Directeur des opérations, Nuru aligne l’exécution quotidienne des sociétés opérationnelles de Lake Group afin que les unités énergie, logistique et industrielles livrent de manière fiable selon les standards du Groupe.',
  'leadership.142':
    'Le rôle couvre la performance opérationnelle, la coordination entre unités métier et l’amélioration continue des processus qui permettent aux dépôts, flottes, usines et équipes commerciales de fonctionner comme une seule organisation.',
  'leadership.143':
    'Via le siège du Groupe à Dar es Salaam, le bureau des opérations soutient les directions pays et unités avec des priorités claires, des voies d’escalade et une visibilité sur la performance.',
  'leadership.144': 'Coordination opérationnelle à l’échelle du Groupe',
  'leadership.145': 'Discipline d’exécution entre unités métier',
  'leadership.146': 'Suivi de performance et amélioration continue',
  'leadership.147':
    'Nassoro Abubakari dirige la livraison de projets pour Lake Agro, le bras agroalimentaire et de développement greenfield du Groupe.',
  'leadership.148':
    'Le mandat couvre la planification et l’exécution des programmes agro, la coordination avec les fonctions support du Groupe, et l’alignement des délais de livraison sur les objectifs commerciaux et opérationnels.',
  'leadership.149':
    'Lake Agro s’inscrit dans la stratégie de diversification plus large de Lake Group - étendant les capacités de l’organisation au-delà de l’énergie et de la logistique vers le développement lié à l’agriculture.',
  'leadership.150': 'Planification et livraison des projets Lake Agro',
  'leadership.151': 'Coordination des programmes greenfield et agroalimentaires',
  'leadership.152': 'Alignement des parties prenantes avec les fonctions du Groupe',
  'leadership.153': 'Multi-pays',
  'leadership.16':
    'Les dirigeants qui pilotent Lake Group dans l’énergie, la fabrication, les opérations et l’agroalimentaire.'
};

// Swahili
NEW.sw = {
  'leadership.57': 'Soma zaidi',
  'leadership.58': 'Uongozi wote',
  'leadership.59': 'Makao Makuu ya Kundi',
  'leadership.60': 'Simu',
  'leadership.61': 'Barua pepe',
  'leadership.62': 'Kuhusu Lake Group',
  'leadership.63': 'Kampuni zetu',
  'leadership.64': 'Wasiliana',
  'leadership.65': 'Kutana na timu kamili',
  'leadership.66': 'Historia yetu',
  'leadership.67': 'Wasiliana na Makao Makuu',
  'leadership.68': 'Wasifu wa meli',
  'leadership.69': 'Meli yetu',
  'leadership.70': 'Mtandao wa Afrika',
  'leadership.71': 'Miradi mikubwa',
  'leadership.72': 'Huduma za kontena',
  'leadership.73': 'Wasiliana na Kundi',
  'leadership.74': 'Usafirishaji',
  'leadership.75': 'Uendeshaji',
  'leadership.76': 'Utengenezaji',
  'leadership.77': 'Teknolojia',
  'leadership.78': 'Fedha · Kontena',
  'leadership.79': 'Usindikaji wa Kilimo',
  'leadership.80': 'Lengo',
  'leadership.81': 'Wigo',
  'leadership.82': 'Kote katika Kundi',
  'leadership.83': 'HQ',
  'leadership.84': 'Dar es Salaam',
  'leadership.85': 'Ilianzishwa',
  'leadership.86': 'Nchi',
  'leadership.87': 'Watu',
  'leadership.88': 'Kitengo',
  'leadership.89': 'Miradi',
  'leadership.90': 'Aina',
  'leadership.91': 'Greenfield / Agro',
  'leadership.92': 'Kitengo cha usafirishaji',
  'leadership.93': 'Malori ya Kundi',
  'leadership.94': 'Nchi za korido',
  'leadership.95': 'Uwezo wa TEU (Dar)',
  'leadership.96': 'Eneo la depo',
  'leadership.97': 'Maeneo ya nchi',
  'leadership.98': 'ERP kuu',
  'leadership.99': 'Mifumo ya usafirishaji',
  'leadership.100': 'Wigo wa usalama',
  'leadership.101': 'Teknolojia ya chuma',
  'leadership.102': 'Uwezo wa kila mwaka',
  'leadership.103': 'Eneo la kiwanda',
  'leadership.104':
    'Mjasiriamali aliyetajwa na Forbes aliyeanzisha Lake Oil mwaka 2006 na kuijenga Lake Group kuwa mojawapo ya makundi makubwa ya nishati, usafirishaji na viwanda Afrika Mashariki na Kati.',
  'leadership.105':
    'Anaongoza upanuzi wa viwanda wa kimuundo wa Lake Group - hasa Lake Steel - unaojumuisha miundombinu ya uzalishaji, pato la utengenezaji, bidhaa za saruji na mitandao ya ugavi wa ujenzi.',
  'leadership.106':
    'Anamiliki usanifu wa teknolojia ya biashara na mkakati wa kidijitali - kutoka mazingira ya SAP yaliyowekwa katikati hadi akili ya usafirishaji na usalama wa data wa kuvuka mipaka.',
  'leadership.107':
    'Anaongoza Associated Trans Logistics Ltd (ATL), ikifanya kazi pamoja na Lake Trans kama uti wa mgongo wa usafirishaji kwa meli za mafuta, usafirishaji mzito na korido za mizigo za kimataifa.',
  'leadership.108':
    'Anasimamia mipango ya fedha, uchambuzi wa hatari na utawala wa shirika kwa African Inland Container Depot (AFICD) - jukwaa la dry-port la Lake Group huko Dar es Salaam.',
  'leadership.109': HQ_ADDR,
  'leadership.110':
    'Alizaliwa mwaka 1980 katika familia ya wafanyabiashara, Awadh alisoma Utawala wa Biashara katika Brock University nchini Kanada - akijikimu kwa kazi ndogo huku akijenga ujuzi wa mapema wa biashara. Katikati ya miaka yake ya ishirini alikuwa tayari ameingia katika ukarabati wa malori na biashara ya bidhaa. Mwaka 2006 alianzisha Lake Oil; nyaraka rasmi za Kundi zinamweka akiwa na umri wa miaka 27 wakati wa kuanzisha.',
  'leadership.111':
    'Usimamizi wake leo unajumuisha uuzaji wa mafuta, minyororo ya ugavi, usafirishaji wa chini na utengenezaji mzito wa viwanda nchini Tanzania, Kenya, Zambia, DRC, Burundi na Rwanda - pamoja na uwepo mpana zaidi nchini Ethiopia, Mozambique na Dubai (MERM). Chini ya uenyekiti wake Kundi limepanua mitandao ya vituo (vituo 85 Tanzania pekee), miundombinu ya hifadhi, meli ya malori 700+, vituo vya LPG, Lake Steel, saruji tayari kuchanganywa na huduma za kupanua bandari za AFICD.',
  'leadership.112':
    'Mwaka 2017 Forbes iliripoti kuhusu msukumo wa kikanda wa Lake Oil Group - ikiwemo idhini ya Competition Authority of Kenya ya kununua mtandao wa vituo vya Hashi Energy nchini Kenya - na kuielezea biashara kama jukwaa la nishati lililounganishwa lenye mapato ya dola bilioni. Awadh pia ametambuliwa na African Leadership Magazine (Young Business Leader of the Year, 2022) na kama Young African Energy Leader of the Year (African Business Leadership Awards, 2023).',
  'leadership.113':
    '“Kwa timu ya wahandisi wenye uzoefu na wataalamu wa biashara katika vitengo vyetu, Lake Group iko tayari kikamilifu kukidhi mahitaji ya soko la kimataifa.”',
  'leadership.114': 'Mkakati wa Kundi katika nishati, usafirishaji na viwanda',
  'leadership.115': 'Upanuzi wa kikanda na ushirikiano wa mitaji',
  'leadership.116': 'Utawala na uundaji wa thamani wa muda mrefu',
  'leadership.117':
    'Kama Mkurugenzi Mtendaji wa Utengenezaji, jukumu la Dileep Kumar liko katikati ya mseto wa viwanda wa Kundi zaidi ya petroli. Lake Steel inaendesha kiwanda cha rolling mill cha kiotomatiki chenye kompyuta huko Visiga, Kibaha (Plot 118, Block M), chenye uwezo wa hadi tani 25/saa na uwezo wa kila mwaka wa takriban MT 100,000 - na upanuzi unaozungumzwa hadharani kuelekea MT 150,000.',
  'leadership.118':
    'Kiwanda kilileta Tanzania chuma cha HS-CR chenye nguvu na kinachostahimili kutu, kilichoundwa kudumisha nguvu katika joto la juu na kutoa ustahimilivu wa kutu ulio juu sana kuliko chuma cha kawaida.',
  'leadership.119':
    'Pia jalada lake linaunganishwa na mnyororo wa vifaa vya ujenzi wa Kundi: mimea ya kusagisha ya Gulf Aggregates, shughuli za saruji tayari kuchanganywa za Lake Premix / GCCP huko Dar es Salaam, na mfumo mpana wa bidhaa za ujenzi unaotumikia makandarasi na miradi ya miundombinu.',
  'leadership.120': 'Miundombinu ya uzalishaji wa Lake Steel na pato la kiwanda',
  'leadership.121': 'Bidhaa za saruji na mitandao ya ugavi wa ujenzi',
  'leadership.122': 'Programu za upanuzi wa viwanda katika vitengo vya utengenezaji',
  'leadership.123':
    'Katika Kundi linaloendesha depo za mafuta, malori 700+, yadi za ICD/CFS na rejareja ya nchi nyingi, mifumo ya kidijitali ni mfumo wa neva. Jukumu la Mani linazingatia kuboresha stack ya SAP iliyowekwa katikati ya Lake Group - uti wa mgongo wa uendeshaji kwa maagizo ya usafirishaji, hesabu na uwasilishaji wa fedha katika vitengo kama Lake Trans na AFICD.',
  'leadership.124':
    'Anaingiza akili maalum ya usafirishaji na ufuatiliaji wa meli ili harakati za korido zibaki zinazoonekana kutoka Dar hadi Ndola na zaidi, na kupanua miundombinu ya usalama wa data ya kuvuka mipaka inayolinda mitandao inayounganisha vituo vya Tanzania na shughuli za nchi za kikanda.',
  'leadership.125':
    'Lengo ni safu moja thabiti ya kidijitali inayowawezesha watendaji wa utengenezaji, nishati na usafirishaji kutenda kwa picha ile ile ya wakati halisi.',
  'leadership.126': 'Uboreshaji wa SAP uliowekwa katikati na usanifu wa biashara',
  'leadership.127': 'Ufuatiliaji wa meli na akili ya usafirishaji',
  'leadership.128': 'Usalama wa mtandao wa kuvuka mipaka na miundombinu ya data',
  'leadership.129':
    'Uwingi wa ATL wa Khalid unakaa karibu na Lake Trans Ltd. - kampuni zilizofuata za Kundi (2008) na tawi kuu la usafirishaji wa petroli. Pamoja wanahamisha bidhaa ndani na katika usafirishaji kupitia Tanzania, Zambia, Rwanda, DRC, Burundi, Malawi, Kenya na Uganda.',
  'leadership.130':
    'Ujumbe wa Kundi unataja malori 700+; uwezo wa magari ya mafuta kwa kawaida huanzia lita 12,000–40,000, na ufuatiliaji wa GPS kama kawaida. Warsha huko Kibaha, Kigamboni, Morogoro, Nairobi na Ndola zinasaidia upatikanaji wa mali kwenye korido zinazowezesha mfano wa nchi nyingi wa Lake Group.',
  'leadership.131':
    'Jukumu la ATL ni kuweka mtandao wa kimwili usio na mshono: kuelekeza meli za mafuta, usafirishaji mzito na mirija ya mizigo ili depo, vituo na mimea ya viwanda vibaki vikilishwa.',
  'leadership.132': 'Uelekezaji na utekelezaji wa meli ya usambazaji wa mafuta',
  'leadership.133': 'Usafirishaji mzito na mirija ya mizigo ya kimataifa',
  'leadership.134': 'Uratibu na shughuli za korido za Lake Trans',
  'leadership.135':
    'AFICD ni mali muhimu ya Kundi: depo ya kontena ya ndani huko Tazara / Pugu Road yenye reli kuelekea bandari (~km 6), inayohudumia masoko yaliyofungwa nchi kavu ikiwemo Rwanda, Burundi, Uganda, DRC, Zambia na Malawi.',
  'leadership.136':
    'Yadi ya Dar inashughulikia takriban m² 14,000 yenye uwezo wa karibu TEU 4,000, shughuli za SAP, ukarabati wa kontena, na maeneo dada nchini Zambia (Ndola) na Mozambique (Beira). ACFS inaeneza chapa hiyo kuwa kituo kikubwa cha CFS chenye ghala, mizani na uwezo wa friji.',
  'leadership.137':
    'Kama CFO, jukumu la Singh ni nidhamu ya mtaji na utawala karibu na injini hiyo ya mizigo - mipango, hatari na udhibiti kwa kiasi cha uagizaji-uzoaji, mtiririko unaohusiana na forodha na uondoaji wa kontena.',
  'leadership.138': 'Mipango ya fedha na utendaji kwa AFICD',
  'leadership.139': 'Uchambuzi wa hatari na utawala wa shirika',
  'leadership.140': 'Msaada kwa shughuli za kibiashara za ICD / CFS',
  'leadership.141':
    'Kama Mkurugenzi wa Uendeshaji, Nuru anawajibika kuoanisha utekelezaji wa kila siku katika sihirika za uendeshaji za Lake Group ili vitengo vya nishati, usafirishaji na viwanda vitoe kwa uhakika kulingana na viwango vya Kundi.',
  'leadership.142':
    'Jukumu linajumuisha utendaji wa kioperesheni, uratibu kati ya vitengo vya biashara, na uboreshaji endelevu wa michakato inayoshika depo, meli, mimea na timu za kibiashara zikifanya kazi kama shirika moja.',
  'leadership.143':
    'Kupitia Makao Makuu ya Kundi huko Dar es Salaam, dawati la uendeshaji linasaidia uongozi wa nchi na vitengo kwa vipaumbele wazi, njia za kuongeza suala na uwazi wa utendaji.',
  'leadership.144': 'Uratibu wa kioperesheni kote katika Kundi',
  'leadership.145': 'Nidhamu ya utekelezaji katika vitengo vya biashara',
  'leadership.146': 'Ufuatiliaji wa utendaji na uboreshaji endelevu',
  'leadership.147':
    'Nassoro Abubakari anaongoza utoaji wa miradi kwa Lake Agro, tawi la Kilimo na maendeleo ya greenfield la Kundi.',
  'leadership.148':
    'Jukumu linajumuisha kupanga na kutekeleza programu za kilimo, uratibu na majukumu ya msaada ya Kundi, na kuweka ratiba za utoaji zikilingana na malengo ya kibiashara na uendeshaji.',
  'leadership.149':
    'Lake Agro iko ndani ya mkakati mpana wa mseto wa Lake Group - kupanua uwezo wa shirika zaidi ya nishati na usafirishaji hadi maendeleo yanayohusiana na kilimo.',
  'leadership.150': 'Mipango na utoaji wa miradi ya Lake Agro',
  'leadership.151': 'Uratibu wa programu za greenfield na kilimo biashara',
  'leadership.152': 'Ulinganishaji wa wadau na majukumu ya Kundi',
  'leadership.153': 'Nchi nyingi',
  'leadership.16':
    'Watendaji wanaoendesha Lake Group katika nishati, utengenezaji, uendeshaji na kilimo biashara.'
};

// Hindi
NEW.hi = {
  'leadership.57': 'और पढ़ें',
  'leadership.58': 'सभी नेतृत्व',
  'leadership.59': 'समूह मुख्यालय',
  'leadership.60': 'फ़ोन',
  'leadership.61': 'ईमेल',
  'leadership.62': 'Lake Group के बारे में',
  'leadership.63': 'हमारी कंपनियाँ',
  'leadership.64': 'संपर्क',
  'leadership.65': 'पूरी टीम से मिलें',
  'leadership.66': 'हमारा इतिहास',
  'leadership.67': 'समूह मुख्यालय से संपर्क करें',
  'leadership.68': 'फ़्लीट प्रोफ़ाइल',
  'leadership.69': 'हमारा बेड़ा',
  'leadership.70': 'अफ़्रीका नेटवर्क',
  'leadership.71': 'प्रमुख परियोजनाएँ',
  'leadership.72': 'कंटेनर सेवाएँ',
  'leadership.73': 'समूह से संपर्क करें',
  'leadership.74': 'लॉजिस्टिक्स',
  'leadership.75': 'ऑपरेशन्स',
  'leadership.76': 'विनिर्माण',
  'leadership.77': 'प्रौद्योगिकी',
  'leadership.78': 'वित्त · कंटेनर',
  'leadership.79': 'कृषि प्रसंस्करण',
  'leadership.80': 'फोकस',
  'leadership.81': 'दायरा',
  'leadership.82': 'समूह-व्यापी',
  'leadership.83': 'मुख्यालय',
  'leadership.84': 'दार एस सलाम',
  'leadership.85': 'स्थापना',
  'leadership.86': 'देश',
  'leadership.87': 'लोग',
  'leadership.88': 'यूनिट',
  'leadership.89': 'परियोजनाएँ',
  'leadership.90': 'प्रकार',
  'leadership.91': 'ग्रीनफ़ील्ड / एग्रो',
  'leadership.92': 'लॉजिस्टिक्स यूनिट',
  'leadership.93': 'समूह ट्रक',
  'leadership.94': 'कॉरिडोर देश',
  'leadership.95': 'TEU क्षमता (दार)',
  'leadership.96': 'डिपो स्थान',
  'leadership.97': 'देश साइटें',
  'leadership.98': 'कोर ERP',
  'leadership.99': 'लॉजिस्टिक्स सिस्टम',
  'leadership.100': 'सुरक्षा दायरा',
  'leadership.101': 'स्टील तकनीक',
  'leadership.102': 'वार्षिक क्षमता',
  'leadership.103': 'मिल स्थान',
  'leadership.104':
    'Forbes में प्रदर्शित उद्यमी जिन्होंने 2006 में Lake Oil की स्थापना की और Lake Group को पूर्वी और मध्य अफ़्रीका के अग्रणी ऊर्जा, लॉजिस्टिक्स और औद्योगिक समूहों में से एक बनाया।',
  'leadership.105':
    'Lake Group के संरचनात्मक औद्योगिक विस्तार का नेतृत्व करते हैं - विशेष रूप से Lake Steel - जिसमें उत्पादन अवसंरचना, विनिर्माण आउटपुट, कंक्रीट उत्पाद और निर्माण आपूर्ति नेटवर्क शामिल हैं।',
  'leadership.106':
    'एंटरप्राइज़ प्रौद्योगिकी आर्किटेक्चर और डिजिटल रणनीति के स्वामी - केंद्रीकृत SAP वातावरण से लेकर लॉजिस्टिक्स इंटेलिजेंस और सीमा-पार डेटा सुरक्षा तक।',
  'leadership.107':
    'Associated Trans Logistics Ltd (ATL) का निर्देशन करते हैं, जो Lake Trans के साथ ईंधन फ़्लीट, हेवी हॉलेज और बहु-राष्ट्रीय कार्गो कॉरिडोर के लिए लॉजिस्टिकल रीढ़ के रूप में कार्य करता है।',
  'leadership.108':
    'African Inland Container Depot (AFICD) के लिए वित्तीय नियोजन, जोखिम विश्लेषण और कॉर्पोरेट गवर्नेंस की देखरेख - दार एस सलाम में Lake Group का ड्राई-पोर्ट प्लेटफ़ॉर्म।',
  'leadership.109': HQ_ADDR,
  'leadership.110':
    '1980 में व्यापारियों के परिवार में जन्मे अवध ने कनाडा की Brock University में बिज़नेस एडमिनिस्ट्रेशन की पढ़ाई की - छोटे कामों से खुद का खर्च चलाते हुए शुरुआती व्यापारिक समझ बनाई। बीस की उम्र के मध्य तक वे ट्रक मरम्मत और कमोडिटी ट्रेडिंग में आ चुके थे। 2006 में उन्होंने Lake Oil शुरू किया; आधिकारिक समूह सामग्री उन्हें स्थापना के समय 27 वर्ष बताती है।',
  'leadership.111':
    'आज उनकी निगरानी तेल विपणन, आपूर्ति श्रृंखला, डाउनस्ट्रीम लॉजिस्टिक्स और भारी औद्योगिक विनिर्माण तक फैली है - तंज़ानिया, केन्या, ज़ाम्बिया, डीआरसी, बुरुंडी और रवांडा में - तथा व्यापक समूह उपस्थिति इथियोपिया, मोज़ाम्बिक और दुबई (MERM) में भी है। उनकी अध्यक्षता में समूह ने रिटेल नेटवर्क (केवल तंज़ानिया में 85 स्टेशन), भंडारण अवसंरचना, 700+ ट्रक फ़्लीट, LPG टर्मिनल, Lake Steel, रेडी-मिक्स कंक्रीट और AFICD पोर्ट-एक्सटेंशन सेवाएँ बढ़ाई हैं।',
  'leadership.112':
    '2017 में Forbes ने Lake Oil Group के क्षेत्रीय विस्तार को कवर किया - जिसमें Hashi Energy के केन्याई स्टेशन नेटवर्क अधिग्रहण के लिए Competition Authority of Kenya की मंजूरी शामिल थी - और उद्यम को अरब-डॉलर (राजस्व) एकीकृत ऊर्जा प्लेटफ़ॉर्म बताया। अवध को African Leadership Magazine (Young Business Leader of the Year, 2022) और Young African Energy Leader of the Year (African Business Leadership Awards, 2023) से भी सम्मानित किया गया है।',
  'leadership.113':
    '“हमारी इकाइयों में अनुभवी इंजीनियरों और व्यावसायिक पेशेवरों की टीम के साथ, Lake Group वैश्विक बाज़ार की माँगों को पूरा करने के लिए पूरी तरह तैयार है।”',
  'leadership.114': 'ऊर्जा, लॉजिस्टिक्स और उद्योग में समूह रणनीति',
  'leadership.115': 'क्षेत्रीय विस्तार और पूंजी साझेदारियाँ',
  'leadership.116': 'गवर्नेंस और दीर्घकालिक मूल्य सृजन',
  'leadership.117':
    'विनिर्माण मुख्य कार्यकारी अधिकारी के रूप में, दिलीप कुमार का जनादेश पेट्रोलियम से परे समूह के विविधीकरण के औद्योगिक केंद्र में है। लेक स्टील Visiga, Kibaha (Plot 118, Block M) में कम्प्यूटरीकृत स्वचालित रोलिंग मिल संचालित करता है, जिसकी थ्रूपुट लगभग 25 टन/घंटा और वार्षिक क्षमता लगभग 100,000 MT है - सार्वजनिक रूप से चर्चा किए गए विस्तार के साथ 150,000 MT की ओर।',
  'leadership.118':
    'मिल ने तंज़ानिया में उच्च-शक्ति जंग-प्रतिरोधी (HS-CR) रीबार पेश किया, जिसे ऊँचे तापमान पर शक्ति बनाए रखने और सामान्य रीबार से कहीं अधिक जंग प्रतिरोध देने के लिए डिज़ाइन किया गया है।',
  'leadership.119':
    'उनका पोर्टफ़ोलियो समूह की निर्माण-सामग्री श्रृंखला से भी जुड़ा है: Gulf Aggregates क्रशिंग प्लांट, दार एस सलाम में Lake Premix / GCCP रेडी-मिक्स संचालन, और व्यापक बिल्डिंग-प्रोडक्ट इकोसिस्टम जो ठेकेदारों और अवसंरचना परियोजनाओं की आपूर्ति करता है।',
  'leadership.120': 'Lake Steel उत्पादन अवसंरचना और मिल आउटपुट',
  'leadership.121': 'कंक्रीट उत्पाद और निर्माण आपूर्ति नेटवर्क',
  'leadership.122': 'विनिर्माण इकाइयों में औद्योगिक विस्तार कार्यक्रम',
  'leadership.123':
    'एक ऐसे समूह में जो ईंधन डिपो, 700+ ट्रक, ICD/CFS यार्ड और बहु-देशीय रिटेल चलाता है, डिजिटल सिस्टम तंत्रिका तंत्र हैं। चौधरी का जनादेश Lake Group के केंद्रीकृत SAP स्टैक को अनुकूलित करने पर केंद्रित है - शिपमेंट ऑर्डर, इन्वेंटरी और वित्तीय पोस्टिंग के लिए परिचालन रीढ़, Lake Trans और AFICD जैसी इकाइयों में।',
  'leadership.124':
    'वे कस्टम लॉजिस्टिक्स और फ़्लीट-ट्रैकिंग इंटेलिजेंस एम्बेड करते हैं ताकि कॉरिडोर मूवमेंट दार से न्डोला और उससे आगे दिखाई दें, और सीमा-पार डेटा सुरक्षा अवसंरचना का विस्तार करते हैं जो तंज़ानिया हब को क्षेत्रीय देश संचालन से जोड़ने वाले नेटवर्क की रक्षा करती है।',
  'leadership.125':
    'लक्ष्य एक एकल, लचीली डिजिटल परत है जिससे विनिर्माण, ऊर्जा और लॉजिस्टिक्स के अधिकारी एक ही रियल-टाइम चित्र पर कार्य कर सकें।',
  'leadership.126': 'केंद्रीकृत SAP अनुकूलन और एंटरप्राइज़ आर्किटेक्चर',
  'leadership.127': 'फ़्लीट ट्रैकिंग और लॉजिस्टिक्स इंटेलिजेंस',
  'leadership.128': 'सीमा-पार साइबर सुरक्षा और डेटा अवसंरचना',
  'leadership.129':
    'शेट्टी का ATL विंग Lake Trans Ltd. के बगल में है - समूह की दूसरी कंपनी (2008) और प्राथमिक पेट्रोलियम हॉलेज शाखा। साथ मिलकर वे तंज़ानिया, ज़ाम्बिया, रवांडा, डीआरसी, बुरुंडी, मलावी, केन्या और युगांडा में स्थानीय और ट्रांज़िट उत्पाद ले जाते हैं।',
  'leadership.130':
    'समूह संदेश 700+ ट्रक बताता है; टैंक क्षमता आमतौर पर 12,000–40,000 लीटर होती है, GPS ट्रैकिंग मानक के साथ। Kibaha, Kigamboni, Morogoro, Nairobi और Ndola की वर्कशॉप उन कॉरिडोर पर एसेट अपटाइम का समर्थन करती हैं जो Lake Group के बहु-देश मॉडल को संभव बनाते हैं।',
  'leadership.131':
    'ATL की भूमिका भौतिक नेटवर्क को निर्बाध रखना है: ईंधन फ़्लीट, हेवी हॉलेज और कार्गो पाइपलाइन का रूटिंग ताकि डिपो, स्टेशन और औद्योगिक प्लांट आपूर्ति में रहें।',
  'leadership.132': 'ईंधन वितरण फ़्लीट रूटिंग और निष्पादन',
  'leadership.133': 'हेवी हॉलेज और बहु-राष्ट्रीय कार्गो पाइपलाइन',
  'leadership.134': 'Lake Trans कॉरिडोर संचालन के साथ समन्वय',
  'leadership.135':
    'AFICD एक मुख्य समूह परिसंपत्ति है: Tazara / Pugu Road पर अंतर्देशीय कंटेनर डिपो, पोर्ट की ओर रेल साइ딩 (~6 किमी) के साथ, जो रवांडा, बुरुंडी, युगांडा, डीआरसी, ज़ाम्बिया और मलावी सहित लैंडलॉक बाज़ारों की सेवा करता है।',
  'leadership.136':
    'दार यार्ड लगभग 14,000 m² में फैला है, क्षमता लगभग 4,000 TEU, SAP-आधारित संचालन, कंटेनर मरम्मत, तथा ज़ाम्बिया (Ndola) और मोज़ाम्बिक (Beira) में सिस्टर साइटें। ACFS ब्रांड को बड़े CFS टर्मिनल में विस्तारित करता है - वेयरहाउस, वेब्रिज और रीफ़र क्षमता के साथ।',
  'leadership.137':
    'CFO के रूप में कुमार का ब्रीफ उस कार्गो इंजन के आसपास पूंजी अनुशासन और गवर्नेंस है - आयात-निर्यात वॉल्यूम, कस्टम-लिंक्ड वर्कफ़्लो और कंटेनर क्लियरिंग के लिए नियोजन, जोखिम और नियंत्रण।',
  'leadership.138': 'AFICD के लिए वित्तीय नियोजन और प्रदर्शन',
  'leadership.139': 'जोखिम विश्लेषण और कॉर्पोरेट गवर्नेंस',
  'leadership.140': 'ICD / CFS वाणिज्यिक संचालन के लिए समर्थन',
  'leadership.141':
    'ऑपरेशन्स निदेशक के रूप में, नुरू Lake Group की ऑपरेटिंग कंपनियों में दिन-प्रतिदिन निष्पादन को संरेखित करने के लिए ज़िम्मेदार हैं ताकि ऊर्जा, लॉजिस्टिक्स और औद्योगिक इकाइयाँ समूह मानकों के अनुसार विश्वसनीय रूप से डिलीवर करें।',
  'leadership.142':
    'भूमिका में परिचालन प्रदर्शन, व्यावसायिक इकाइयों के बीच समन्वय, और उन प्रक्रियाओं का निरंतर सुधार शामिल है जो डिपो, फ़्लीट, प्लांट और वाणिज्यिक टीमों को एक संगठन के रूप में चलाते हैं।',
  'leadership.143':
    'दार एस सलाम में समूह मुख्यालय के माध्यम से, ऑपरेशन्स डेस्क देश और यूनिट नेतृत्व को स्पष्ट प्राथमिकताओं, एस्केलेशन पथ और प्रदर्शन दृश्यता के साथ समर्थन करता है।',
  'leadership.144': 'समूह-व्यापी परिचालन समन्वय',
  'leadership.145': 'व्यावसायिक इकाइयों में निष्पादन अनुशासन',
  'leadership.146': 'प्रदर्शन निगरानी और निरंतर सुधार',
  'leadership.147':
    'नस्सोरो अबूबकरी Lake Agro के लिए परियोजना डिलीवरी का नेतृत्व करते हैं - समूह की कृषि-व्यवसाय और ग्रीनफ़ील्ड विकास शाखा।',
  'leadership.148':
    'जनादेश में एग्रो कार्यक्रमों की योजना और निष्पादन, समूह सहायता कार्यों के साथ समन्वय, तथा वाणिज्यिक और परिचालन लक्ष्यों के साथ डिलीवरी समयसीमा का संरेखण शामिल है।',
  'leadership.149':
    'Lake Agro Lake Group की व्यापक विविधीकरण रणनीति के भीतर है - ऊर्जा और लॉजिस्टिक्स से आगे कृषि-संबद्ध विकास में संगठन की क्षमताओं का विस्तार।',
  'leadership.150': 'Lake Agro परियोजना नियोजन और डिलीवरी',
  'leadership.151': 'ग्रीनफ़ील्ड और कृषि-व्यवसाय कार्यक्रम समन्वय',
  'leadership.152': 'समूह कार्यों के साथ हितधारक संरेखण',
  'leadership.153': 'बहु-देशीय',
  'leadership.16':
    'ऊर्जा, विनिर्माण, ऑपरेशन्स और कृषि-व्यवसाय में Lake Group को आगे बढ़ाने वाले कार्यकारी।'
};

// Arabic
NEW.ar = {
  'leadership.57': 'اقرأ المزيد',
  'leadership.58': 'كل القيادة',
  'leadership.59': 'المقر الرئيسي للمجموعة',
  'leadership.60': 'الهاتف',
  'leadership.61': 'البريد الإلكتروني',
  'leadership.62': 'عن Lake Group',
  'leadership.63': 'شركاتنا',
  'leadership.64': 'اتصل',
  'leadership.65': 'تعرّف على الفريق كاملاً',
  'leadership.66': 'تاريخنا',
  'leadership.67': 'اتصل بالمقر الرئيسي',
  'leadership.68': 'ملف الأسطول',
  'leadership.69': 'أسطولنا',
  'leadership.70': 'شبكة أفريقيا',
  'leadership.71': 'المشاريع الكبرى',
  'leadership.72': 'خدمات الحاويات',
  'leadership.73': 'اتصل بالمجموعة',
  'leadership.74': 'اللوجستيات',
  'leadership.75': 'العمليات',
  'leadership.76': 'التصنيع',
  'leadership.77': 'التكنولوجيا',
  'leadership.78': 'المالية · الحاويات',
  'leadership.79': 'التصنيع الزراعي',
  'leadership.80': 'التركيز',
  'leadership.81': 'النطاق',
  'leadership.82': 'على مستوى المجموعة',
  'leadership.83': 'المقر',
  'leadership.84': 'دار السلام',
  'leadership.85': 'التأسيس',
  'leadership.86': 'الدول',
  'leadership.87': 'الأشخاص',
  'leadership.88': 'الوحدة',
  'leadership.89': 'المشاريع',
  'leadership.90': 'النوع',
  'leadership.91': 'مشاريع جديدة / زراعي',
  'leadership.92': 'وحدة لوجستية',
  'leadership.93': 'شاحنات المجموعة',
  'leadership.94': 'دول الممرات',
  'leadership.95': 'سعة TEU (دار)',
  'leadership.96': 'موقع المستودع',
  'leadership.97': 'مواقع الدول',
  'leadership.98': 'نظام ERP الأساسي',
  'leadership.99': 'أنظمة اللوجستيات',
  'leadership.100': 'نطاق الأمن',
  'leadership.101': 'تقنية الصلب',
  'leadership.102': 'الطاقة السنوية',
  'leadership.103': 'موقع المصنع',
  'leadership.104':
    'رائد أعمال أبرزته فوربس أسس Lake Oil عام 2006 وبنى Lake Group لتصبح من أبرز المجموعات الصناعية والطاقة واللوجستيات في شرق ووسط أفريقيا.',
  'leadership.105':
    'يقود التوسعات الصناعية الهيكلية لـ Lake Group - ولا سيما Lake Steel - وتشمل بنية الإنتاج ومخرجات التصنيع ومنتجات الخرسانة وشبكات توريد البناء.',
  'leadership.106':
    'يملك هندسة تكنولوجيا المؤسسة والاستراتيجية الرقمية - من بيئات SAP المركزية إلى ذكاء اللوجستيات وأمن البيانات عبر الحدود.',
  'leadership.107':
    'يدير Associated Trans Logistics Ltd (ATL) إلى جانب Lake Trans كعمود فقري لوجستي لأسطول الوقود والنقل الثقيل وممرات الشحن متعددة الجنسيات.',
  'leadership.108':
    'يشرف على التخطيط المالي وتحليل المخاطر وحوكمة الشركات لمستودع الحاويات الداخلي الأفريقي (AFICD) - منصة الميناء الجاف التابعة لـ Lake Group في دار السلام.',
  'leadership.109': HQ_ADDR,
  'leadership.110':
    'وُلد عام 1980 في عائلة من التجار، ودرس إدارة الأعمال في جامعة Brock في كندا - معتمداً على وظائف متفرقة بينما يبني غرائز تجارية مبكرة. وبحلول منتصف العشرينيات كان قد انتقل إلى تجديد الشاحنات وتجارة السلع. أطلق Lake Oil عام 2006؛ وتضع مواد المجموعة الرسمية عمره عند 27 عاماً وقت التأسيس.',
  'leadership.111':
    'تشمل إشرافه اليوم تسويق النفط وسلسلة التوريد واللوجستيات اللاحقة والتصنيع الصناعي الثقيل عبر تنزانيا وكينيا وزامبيا والكونغو الديمقراطية وبوروندي ورواندا - مع حضور أوسع للمجموعة أيضاً في إثيوبيا وموزمبيق ودبي (MERM). وتحت رئاسته نمت شبكات التجزئة (85 محطة في تنزانيا وحدها) وبنية التخزين وأسطول يزيد عن 700 شاحنة ومحطات غاز البترول المسال وLake Steel والخرسانة الجاهزة وخدمات توسيع الموانئ لدى AFICD.',
  'leadership.112':
    'في عام 2017 غطت فوربس التوسع الإقليمي لـ Lake Oil Group - بما في ذلك موافقة هيئة المنافسة في كينيا على الاستحواذ على شبكة محطات Hashi Energy الكينية - ووصفت المؤسسة بأنها منصة طاقة متكاملة بإيرادات مليار دولار. كما نال عوض اعترافاً من African Leadership Magazine (قائد الأعمال الشاب للعام، 2022) ولقب قائد الطاقة الأفريقي الشاب للعام (جوائز القيادة التجارية الأفريقية، 2023).',
  'leadership.113':
    '«بفضل فريق من المهندسين ذوي الخبرة والمهنيين التجاريين عبر وحداتنا، فإن Lake Group مهيأة بالكامل لتلبية متطلبات السوق العالمية.»',
  'leadership.114': 'استراتيجية المجموعة عبر الطاقة واللوجستيات والصناعة',
  'leadership.115': 'التوسع الإقليمي وشراكات رأس المال',
  'leadership.116': 'الحوكمة وخلق القيمة على المدى الطويل',
  'leadership.117':
    'بصفته الرئيس التنفيذي للتصنيع، يقع تفويض ديليب كومار في قلب التنويع الصناعي للمجموعة خارج النفط. وتشغّل ليك ستيل مطحنة درفلة آلية محوسبة في فيسيغا، كيباهة (القطعة ١١٨، البلوك M)، بطاقة إنتاج تصل إلى نحو ٢٥ طناً/ساعة وطاقة سنوية حوالي ١٠٠,٠٠٠ طن متري - مع توسع مناقش علناً نحو ١٥٠,٠٠٠ طن متري.',
  'leadership.118':
    'أدخلت المطحنة حديد التسليح عالي القوة المقاوم للتآكل (HS-CR) إلى تنزانيا، المصمم للاحتفاظ بالقوة عند درجات حرارة مرتفعة وتقديم مقاومة تآكل أعلى بكثير من حديد التسليح العادي.',
  'leadership.119':
    'يرتبط محفظته أيضاً بسلسلة مواد البناء للمجموعة: مصانع سحق Gulf Aggregates، وعمليات الخرسانة الجاهزة Lake Premix / GCCP في دار السلام، والنظام الأوسع لمنتجات البناء الذي يغذي المقاولين ومشاريع البنية التحتية.',
  'leadership.120': 'بنية إنتاج Lake Steel ومخرجات المطحنة',
  'leadership.121': 'منتجات الخرسانة وشبكات توريد البناء',
  'leadership.122': 'برامج التوسع الصناعي عبر وحدات التصنيع',
  'leadership.123':
    'عبر مجموعة تدير مستودعات وقود وأكثر من 700 شاحنة وساحات ICD/CFS وتجزئة متعددة البلدان، تُعد الأنظمة الرقمية الجهاز العصبي. ويركز تفويض شودري على تحسين حزمة SAP المركزية لدى Lake Group - العمود الفقري التشغيلي لطلبات الشحن والمخزون والقيود المالية عبر وحدات مثل Lake Trans وAFICD.',
  'leadership.124':
    'يدمج ذكاء لوجستيات وتتبع أسطول مخصصاً لتبقى حركات الممرات مرئية من دار إلى ندولا وما بعدها، ويوسّع بنية أمن البيانات عبر الحدود لحماية الشبكات التي تربط مراكز تنزانيا بعمليات الدول الإقليمية.',
  'leadership.125':
    'الهدف طبقة رقمية واحدة مرنة تتيح لمديري التصنيع والطاقة واللوجستيات العمل على الصورة اللحظية ذاتها.',
  'leadership.126': 'تحسين SAP المركزي وهندسة المؤسسة',
  'leadership.127': 'تتبع الأسطول وذكاء اللوجستيات',
  'leadership.128': 'الأمن السيبراني عبر الحدود وبنية البيانات',
  'leadership.129':
    'يقع جناح ATL لدى شيتي بجوار Lake Trans Ltd. - الشركة الثانية للمجموعة (2008) وذراع النقل النفطي الرئيسي. معاً ينقلان المنتجات محلياً وفي العبور عبر تنزانيا وزامبيا ورواندا والكونغو الديمقراطية وبوروندي وملاوي وكينيا وأوغندا.',
  'leadership.130':
    'تشير رسائل المجموعة إلى أكثر من 700 شاحنة؛ وتتراوح سعات الصهاريج عادة بين 12,000 و40,000 لتر مع تتبع GPS كمعيار. وتدعم الورش في كيباهة وكيجامبوني وموروغورو ونيروبي وندولا جاهزية الأصول على الممرات التي تجعل نموذج Lake Group متعدد البلدان ممكناً.',
  'leadership.131':
    'دور ATL هو إبقاء الشبكة المادية سلسة: توجيه أساطيل الوقود والنقل الثقيل وأنابيب الشحن حتى تظل المستودعات والمحطات والمصانع الصناعية مزوَّدة.',
  'leadership.132': 'توجيه أسطول توزيع الوقود وتنفيذه',
  'leadership.133': 'النقل الثقيل وأنابيب الشحن متعددة الجنسيات',
  'leadership.134': 'التنسيق مع عمليات ممرات Lake Trans',
  'leadership.135':
    'AFICD أصل أساسي للمجموعة: مستودع حاويات داخلي في تازارا / طريق بوغو مع وصلة سكك حديدية نحو الميناء (~6 كم)، يخدم أسواقاً حبيسة تشمل رواندا وبوروندي وأوغندا والكونغو الديمقراطية وزامبيا وملاوي.',
  'leadership.136':
    'تغطي ساحة دار نحو 14,000 م² بسعة حوالي 4,000 TEU، وعمليات قائمة على SAP، وإصلاح الحاويات، ومواقع شقيقة في زامبيا (ندولا) وموزمبيق (بيرا). ويمتد ACFS بالعلامة إلى محطة CFS أكبر بمستودع وجسر وزن وسعة تبريد.',
  'leadership.137':
    'بصفته المدير المالي، يتمحور تفويض كومار حول انضباط رأس المال والحوكمة حول محرك الشحن هذا - التخطيط والمخاطر والضوابط لأحجام الاستيراد والتصدير وسير العمل المرتبط بالجمارك وتخليص الحاويات.',
  'leadership.138': 'التخطيط المالي والأداء لـ AFICD',
  'leadership.139': 'تحليل المخاطر وحوكمة الشركات',
  'leadership.140': 'دعم العمليات التجارية لـ ICD / CFS',
  'leadership.141':
    'بصفته مدير العمليات، يتولى نورو مواءمة التنفيذ اليومي عبر شركات التشغيل التابعة لـ Lake Group حتى تُسلّم وحدات الطاقة واللوجستيات والصناعة بموثوقية وفق معايير المجموعة.',
  'leadership.142':
    'يمتد الدور إلى الأداء التشغيلي والتنسيق بين وحدات الأعمال والتحسين المستمر للعمليات التي تُبقي المستودعات والأساطيل والمصانع والفرق التجارية تعمل كمنظمة واحدة.',
  'leadership.143':
    'من خلال المقر الرئيسي للمجموعة في دار السلام، يدعم مكتب العمليات قيادة الدول والوحدات بأولويات واضحة ومسارات تصعيد ورؤية للأداء.',
  'leadership.144': 'التنسيق التشغيلي على مستوى المجموعة',
  'leadership.145': 'انضباط التنفيذ عبر وحدات الأعمال',
  'leadership.146': 'مراقبة الأداء والتحسين المستمر',
  'leadership.147':
    'يقود ناسورو أبو بكر تسليم المشاريع لـ Lake Agro، ذراع الأعمال الزراعية وتطوير المشاريع الجديدة في المجموعة.',
  'leadership.148':
    'يشمل التفويض تخطيط وتنفيذ برامج الزراعة والتنسيق مع وظائف دعم المجموعة ومواءمة جداول التسليم مع الأهداف التجارية والتشغيلية.',
  'leadership.149':
    'تقع Lake Agro ضمن استراتيجية التنويع الأوسع لـ Lake Group - توسيع قدرات المنظمة خارج الطاقة واللوجستيات إلى التطوير المرتبط بالزراعة.',
  'leadership.150': 'تخطيط وتسليم مشاريع Lake Agro',
  'leadership.151': 'تنسيق برامج المشاريع الجديدة والأعمال الزراعية',
  'leadership.152': 'مواءمة أصحاب المصلحة مع وظائف المجموعة',
  'leadership.153': 'متعدد البلدان',
  'leadership.16':
    'المسؤولون التنفيذيون الذين يقودون Lake Group عبر الطاقة والتصنيع والعمليات والأعمال الزراعية.'
};

function assertParity() {
  const langs = ['en', 'fr', 'sw', 'hi', 'ar'];
  const enKeys = Object.keys(NEW.en).sort();
  for (const lang of langs) {
    const keys = Object.keys(NEW[lang]).sort();
    if (keys.length !== enKeys.length) {
      throw new Error(`${lang} key count ${keys.length} != en ${enKeys.length}`);
    }
    for (const k of enKeys) {
      if (!NEW[lang][k] || !String(NEW[lang][k]).trim()) {
        throw new Error(`Empty/missing ${lang} ${k}`);
      }
    }
  }
}

function mergeKeys(data) {
  for (const lang of Object.keys(NEW)) {
    if (!data[lang]) data[lang] = {};
    Object.assign(data[lang], NEW[lang]);
  }
}

function wireListing() {
  const file = path.join(ROOT, 'leadership.html');
  let h = fs.readFileSync(file, 'utf8');

  const cards = [
    {
      href: 'leadership-ally-edha-awadh.html',
      nameKey: 'leadership.9',
      name: 'Ally Edha Awadh',
      roleKey: 'leadership.8',
      role: 'Executive Chairman &amp; Owner',
      sumKey: 'leadership.104',
      sum: NEW.en['leadership.104']
    },
    {
      href: 'leadership-dileep-kumar.html',
      nameKey: 'leadership.17',
      name: 'Dileep Kumar',
      roleKey: 'leadership.18',
      role: 'CEO · Manufacturing Division',
      sumKey: 'leadership.105',
      sum: NEW.en['leadership.105']
    },
    {
      href: 'leadership-sridhar-mani.html',
      nameKey: 'leadership.20',
      name: 'Sridhar Mani',
      roleKey: 'leadership.21',
      role: 'Director of Digital Transformation',
      sumKey: 'leadership.106',
      sum: NEW.en['leadership.106']
    },
    {
      href: 'leadership-mohammed-khalid.html',
      nameKey: 'leadership.23',
      name: 'Mohammed Khalid',
      roleKey: 'leadership.24',
      role: 'Managing Director · ATL',
      sumKey: 'leadership.107',
      sum: NEW.en['leadership.107']
    },
    {
      href: 'leadership-bibhuti-singh.html',
      nameKey: 'leadership.26',
      name: 'Bibhuti Singh',
      roleKey: 'leadership.27',
      role: 'CFO · AFICD',
      sumKey: 'leadership.108',
      sum: NEW.en['leadership.108']
    },
    {
      href: 'leadership-juma-nuru.html',
      nameKey: 'leadership.51',
      name: 'Juma Nuru',
      roleKey: 'leadership.52',
      role: 'Director of Operations · Lake Group',
      sumKey: 'leadership.53',
      sum: 'Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.'
    },
    {
      href: 'leadership-nassoro-abubakari.html',
      nameKey: 'leadership.54',
      name: 'Nassoro Abubakari',
      roleKey: 'leadership.55',
      role: 'Project Manager · Lake Agro',
      sumKey: 'leadership.56',
      sum: 'Manages Lake Agro project delivery - greenfield development, agribusiness programmes and related Group project coordination.'
    }
  ];

  for (const c of cards) {
    // Role
    h = h.replace(
      new RegExp(
        `(href="${c.href}"[\\s\\S]*?<h3>)([\\s\\S]*?)(</h3>\\s*<p class="ld-person-role">)([\\s\\S]*?)(</p>\\s*<p class="ld-person-sum">)([\\s\\S]*?)(</p>\\s*<span class="ld-person-more">)([\\s\\S]*?)(</span>)`
      ),
      `$1<span data-i18n="${c.nameKey}">${c.name}</span>$3<span data-i18n="${c.roleKey}">${c.role}</span>$5<span data-i18n="${c.sumKey}">${c.sum}</span>$7<span data-i18n="leadership.57">Read more</span>$9`
    );
  }

  // Wire subtitle that already has key 16 in dict but was unused / mismatched label
  h = h.replace(
    /data-i18n="leadership\.15" class="section-title" style="text-align:center">Corporate Management<\/h2>/,
    'data-i18n="leadership.15" class="section-title" style="text-align:center">Corporate Management</h2>\n      <p data-i18n="leadership.16" class="section-subtitle" style="text-align:center;margin-top:12px">The executives driving Lake Group across energy, manufacturing, operations and agribusiness.</p>'
  );

  fs.writeFileSync(file, h, 'utf8');
  console.log('wired leadership.html');
}

function crumb(name) {
  return `<nav class="lp-crumb" aria-label="Breadcrumb">
      <a href="index.html" data-i18n="nav.home">Home</a><span>/</span>
      <a href="leadership.html" data-i18n="leadership.1">Leadership</a><span>/</span>
      <span>${name}</span>
    </nav>`;
}

function contactBlock() {
  return `<div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong>`;
}

const PROFILES = {
  'leadership-ally-edha-awadh.html': {
    name: 'Ally Edha Awadh',
    replaceArticle: true,
    article: `
        <div class="lp-unit" data-i18n="leadership.5">Group Leadership</div>
        <h1 class="lp-name">Ally Edha Awadh</h1>
        <p class="lp-role" data-i18n="leadership.8">Executive Chairman &amp; Owner</p>
        <p class="lp-lede" data-i18n="leadership.104">${NEW.en['leadership.104']}</p>
        <p data-i18n="leadership.110">${NEW.en['leadership.110']}</p>
        <p data-i18n="leadership.111">${NEW.en['leadership.111']}</p>
        <p data-i18n="leadership.112">${NEW.en['leadership.112']}</p>
        <blockquote class="lp-quote" data-i18n="leadership.113">${NEW.en['leadership.113']}</blockquote>
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.114">${NEW.en['leadership.114']}</span></li>
          <li><span>02</span><span data-i18n="leadership.115">${NEW.en['leadership.115']}</span></li>
          <li><span>03</span><span data-i18n="leadership.116">${NEW.en['leadership.116']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong data-i18n="leadership.85">Founded</strong><span>2006</span></div>
        <div><strong data-i18n="leadership.86">Countries</strong><span>8+</span></div>
        <div><strong data-i18n="leadership.87">People</strong><span>4,600+</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20Office%20of%20the%20Chairman">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="leadership.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.65">Meet the full team</a>
          <a href="history.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.66">Our history</a>
          <a href="contact.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.67">Contact Group HQ</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-nassoro-abubakari.html">← Nassoro Abubakari</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-dileep-kumar.html">Dileep Kumar →</a>
        </div>
      `
  },
  'leadership-dileep-kumar.html': {
    name: 'Dileep Kumar',
    article: `
        <div class="lp-unit" data-i18n="leadership.76">Manufacturing</div>
        <h1 class="lp-name">Dileep Kumar</h1>
        <p class="lp-role" data-i18n="leadership.18">CEO · Manufacturing Division</p>
        <p class="lp-lede" data-i18n="leadership.105">${NEW.en['leadership.105']}</p>
        <p data-i18n="leadership.117">${NEW.en['leadership.117']}</p>
        <p data-i18n="leadership.118">${NEW.en['leadership.118']}</p>
        <p data-i18n="leadership.119">${NEW.en['leadership.119']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.120">${NEW.en['leadership.120']}</span></li>
          <li><span>02</span><span data-i18n="leadership.121">${NEW.en['leadership.121']}</span></li>
          <li><span>03</span><span data-i18n="leadership.122">${NEW.en['leadership.122']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong>HS-CR</strong><span data-i18n="leadership.101">Steel technology</span></div>
        <div><strong>~100k MT</strong><span data-i18n="leadership.102">Annual capacity</span></div>
        <div><strong>Kibaha</strong><span data-i18n="leadership.103">Mill location</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20CEO%20Manufacturing%20(Dileep Kumar)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="lake-steel.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.lakeSteel">Lake Steel</a>
          <a href="lake-premix-cement.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.lakePremixCement">Lake Premix &amp; Cement</a>
          <a href="gulf-aggregates.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.gulfAggregates">Gulf Aggregates</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-ally-edha-awadh.html">← Ally Edha Awadh</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-sridhar-mani.html">Sridhar Mani →</a>
        </div>
      `
  },
  'leadership-sridhar-mani.html': {
    name: 'Sridhar Mani',
    article: `
        <div class="lp-unit" data-i18n="leadership.77">Technology</div>
        <h1 class="lp-name">Sridhar Mani</h1>
        <p class="lp-role" data-i18n="leadership.21">Director of Digital Transformation</p>
        <p class="lp-lede" data-i18n="leadership.106">${NEW.en['leadership.106']}</p>
        <p data-i18n="leadership.123">${NEW.en['leadership.123']}</p>
        <p data-i18n="leadership.124">${NEW.en['leadership.124']}</p>
        <p data-i18n="leadership.125">${NEW.en['leadership.125']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.126">${NEW.en['leadership.126']}</span></li>
          <li><span>02</span><span data-i18n="leadership.127">${NEW.en['leadership.127']}</span></li>
          <li><span>03</span><span data-i18n="leadership.128">${NEW.en['leadership.128']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong>SAP</strong><span data-i18n="leadership.98">Core ERP</span></div>
        <div><strong>Fleet IQ</strong><span data-i18n="leadership.99">Logistics systems</span></div>
        <div><strong data-i18n="leadership.153">Multi-country</strong><span data-i18n="leadership.100">Security scope</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20Director%20Digital%20Transformation%20(Sridhar%20Mani)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="fleet.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.69">Our fleet</a>
          <a href="africa-network.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.70">Africa network</a>
          <a href="aficd.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.aficd">AFICD</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-dileep-kumar.html">← Dileep Kumar</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-mohammed-khalid.html">Mohammed Khalid →</a>
        </div>
      `
  },
  'leadership-mohammed-khalid.html': {
    name: 'Mohammed Khalid',
    article: `
        <div class="lp-unit" data-i18n="leadership.74">Logistics</div>
        <h1 class="lp-name">Mohammed Khalid</h1>
        <p class="lp-role" data-i18n="leadership.24">Managing Director · ATL</p>
        <p class="lp-lede" data-i18n="leadership.107">${NEW.en['leadership.107']}</p>
        <p data-i18n="leadership.129">${NEW.en['leadership.129']}</p>
        <p data-i18n="leadership.130">${NEW.en['leadership.130']}</p>
        <p data-i18n="leadership.131">${NEW.en['leadership.131']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.132">${NEW.en['leadership.132']}</span></li>
          <li><span>02</span><span data-i18n="leadership.133">${NEW.en['leadership.133']}</span></li>
          <li><span>03</span><span data-i18n="leadership.134">${NEW.en['leadership.134']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong>ATL</strong><span data-i18n="leadership.92">Logistics unit</span></div>
        <div><strong>700+</strong><span data-i18n="leadership.93">Group trucks</span></div>
        <div><strong>8+</strong><span data-i18n="leadership.94">Corridor countries</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20MD%20ATL%20(Mohammed%20Khalid)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="lake-trans.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.lakeTrans">Lake Trans</a>
          <a href="https://atl-tz.com" class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener noreferrer" data-i18n="nav.co.atl">ATL</a>
          <a href="fleet.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.68">Fleet profile</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-sridhar-mani.html">← Sridhar Mani</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-bibhuti-singh.html">Bibhuti Singh →</a>
        </div>
      `
  },
  'leadership-bibhuti-singh.html': {
    name: 'Bibhuti Singh',
    article: `
        <div class="lp-unit" data-i18n="leadership.78">Finance · Containers</div>
        <h1 class="lp-name">Bibhuti Singh</h1>
        <p class="lp-role" data-i18n="leadership.27">CFO · AFICD</p>
        <p class="lp-lede" data-i18n="leadership.108">${NEW.en['leadership.108']}</p>
        <p data-i18n="leadership.135">${NEW.en['leadership.135']}</p>
        <p data-i18n="leadership.136">${NEW.en['leadership.136']}</p>
        <p data-i18n="leadership.137">${NEW.en['leadership.137']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.138">${NEW.en['leadership.138']}</span></li>
          <li><span>02</span><span data-i18n="leadership.139">${NEW.en['leadership.139']}</span></li>
          <li><span>03</span><span data-i18n="leadership.140">${NEW.en['leadership.140']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong>4,000</strong><span data-i18n="leadership.95">TEU capacity (Dar)</span></div>
        <div><strong>Pugu Rd</strong><span data-i18n="leadership.96">Depot location</span></div>
        <div><strong>3</strong><span data-i18n="leadership.97">Country sites</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20CFO%20AFICD%20(Bibhuti%20Singh)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="aficd.html" class="btn btn-outline-dark btn-sm" data-i18n="nav.co.aficd">AFICD</a>
          <a href="container-services.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.72">Container services</a>
          <a href="contact.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.73">Contact Group</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-mohammed-khalid.html">← Mohammed Khalid</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-juma-nuru.html">Juma Nuru →</a>
        </div>
      `
  },
  'leadership-juma-nuru.html': {
    name: 'Juma Nuru',
    article: `
        <div class="lp-unit" data-i18n="leadership.75">Operations</div>
        <h1 class="lp-name">Juma Nuru</h1>
        <p class="lp-role" data-i18n="leadership.52">Director of Operations · Lake Group</p>
        <p class="lp-lede" data-i18n="leadership.53">Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.</p>
        <p data-i18n="leadership.141">${NEW.en['leadership.141']}</p>
        <p data-i18n="leadership.142">${NEW.en['leadership.142']}</p>
        <p data-i18n="leadership.143">${NEW.en['leadership.143']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.144">${NEW.en['leadership.144']}</span></li>
          <li><span>02</span><span data-i18n="leadership.145">${NEW.en['leadership.145']}</span></li>
          <li><span>03</span><span data-i18n="leadership.146">${NEW.en['leadership.146']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong data-i18n="leadership.80">Focus</strong><span data-i18n="leadership.75">Operations</span></div>
        <div><strong data-i18n="leadership.81">Scope</strong><span data-i18n="leadership.82">Group-wide</span></div>
        <div><strong data-i18n="leadership.83">HQ</strong><span data-i18n="leadership.84">Dar es Salaam</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20Director%20of%20Operations%20(Juma%20Nuru)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="about.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.62">About Lake Group</a>
          <a href="services.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.63">Our companies</a>
          <a href="contact.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.64">Contact</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-bibhuti-singh.html">← Bibhuti Singh</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-nassoro-abubakari.html">Nassoro Abubakari →</a>
        </div>
      `
  },
  'leadership-nassoro-abubakari.html': {
    name: 'Nassoro Abubakari',
    article: `
        <div class="lp-unit" data-i18n="leadership.79">Agro Processing</div>
        <h1 class="lp-name">Nassoro Abubakari</h1>
        <p class="lp-role" data-i18n="leadership.55">Project Manager · Lake Agro</p>
        <p class="lp-lede" data-i18n="leadership.56">Manages Lake Agro project delivery - greenfield development, agribusiness programmes and related Group project coordination.</p>
        <p data-i18n="leadership.147">${NEW.en['leadership.147']}</p>
        <p data-i18n="leadership.148">${NEW.en['leadership.148']}</p>
        <p data-i18n="leadership.149">${NEW.en['leadership.149']}</p>
        
        <ul class="lp-mandate">
          <li><span>01</span><span data-i18n="leadership.150">${NEW.en['leadership.150']}</span></li>
          <li><span>02</span><span data-i18n="leadership.151">${NEW.en['leadership.151']}</span></li>
          <li><span>03</span><span data-i18n="leadership.152">${NEW.en['leadership.152']}</span></li>
        </ul>
        <div class="lp-meta">
        <div><strong data-i18n="leadership.88">Unit</strong><span data-i18n="nav.co.lakeAgro">Lake Agro</span></div>
        <div><strong data-i18n="leadership.80">Focus</strong><span data-i18n="leadership.89">Projects</span></div>
        <div><strong data-i18n="leadership.90">Type</strong><span data-i18n="leadership.91">Greenfield / Agro</span></div>
        </div>
        <div class="lp-contact">
          <div><strong data-i18n="leadership.59">Group HQ</strong><span data-i18n="leadership.109">${HQ_ADDR}</span></div>
          <div><strong data-i18n="leadership.60">Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong data-i18n="leadership.61">Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=Attention%3A%20Project%20Manager%20Lake%20Agro%20(Nassoro%20Abubakari)">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          <a href="https://lakeagro.com/" class="btn btn-outline-dark btn-sm" target="_blank" rel="noopener noreferrer" data-i18n="nav.co.lakeAgro">Lake Agro</a>
          <a href="projects.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.71">Major projects</a>
          <a href="contact.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.64">Contact</a>
        </div>
        <div class="lp-nav">
          <a href="leadership-juma-nuru.html">← Juma Nuru</a>
          <a href="leadership.html" data-i18n="leadership.58">All leadership</a>
          <a href="leadership-ally-edha-awadh.html">Ally Edha Awadh →</a>
        </div>
      `
  }
};

function wireProfiles() {
  for (const [fileName, cfg] of Object.entries(PROFILES)) {
    const file = path.join(ROOT, fileName);
    let h = fs.readFileSync(file, 'utf8');
    h = h.replace(
      /<nav class="lp-crumb" aria-label="Breadcrumb">[\s\S]*?<\/nav>/,
      crumb(cfg.name)
    );
    h = h.replace(
      /<article class="lp-body reveal">[\s\S]*?<\/article>/,
      `<article class="lp-body reveal">${cfg.article}</article>`
    );
    fs.writeFileSync(file, h, 'utf8');
    console.log('wired', fileName);
  }
}

function serializeCompact(obj) {
  return JSON.stringify(obj, null, 0)
    .replace(/":/g, '": ')
    .replace(/,"/g, ', "');
}

function main() {
  assertParity();
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  mergeKeys(data);
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(data) + ';\n', 'utf8');
  console.log('updated i18n-content.json/.js with', Object.keys(NEW.en).length, 'keys');
  wireListing();
  wireProfiles();
  console.log('done');
}

main();
