#!/usr/bin/env node
/**
 * One-shot content-audit fixer (2026-07 research pass).
 *
 * For every keyed string correction it updates, consistently:
 *   1. the hardcoded English default in the HTML page(s),
 *   2. the en + fr dictionaries in assets/i18n-content.json,
 *   3. the sw value in the matching scripts/_sw_out_*.json chunk.
 *
 * DELETES removes keys entirely (en/fr/sw + chunk) for content that was
 * removed from the pages (fabricated revenue figure, Lake Gas Ethiopia card).
 *
 * Run `node scripts/build_sw_lang.js` afterwards to regenerate
 * assets/i18n-content.js and re-validate key parity.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// { key: { old: <expected current en>, en, fr, sw } }
const EDITS = {
  // ---- Lake Gas operates in 6 countries (TZ, KE, ZM, RW, BU, DRC), not 7 ----
  'index.50': {
    old: 'Lake Gas operates LPG bottling and distribution with cylinders for domestic and commercial use across 7 countries.',
    en: 'Lake Gas operates LPG bottling and distribution with cylinders for domestic and commercial use across 6 countries.',
    fr: "Lake Gas assure l'embouteillage et la distribution de GPL avec des bouteilles à usage domestique et commercial dans 6 pays.",
    sw: 'Lake Gas inaendesha ujazaji na usambazaji wa gesi ya LPG kwa mitungi ya matumizi ya nyumbani na ya kibiashara katika nchi 6.'
  },
  'index.51': { old: '7 Countries', en: '6 Countries', fr: '6 pays', sw: 'Nchi 6' },
  'lpg.7': {
    old: "Lake Gas Ltd. is East Africa's trusted LPG bottling and distribution company, operating across 7 countries. From domestic cooking to large-scale commercial kitchens and industrial applications, Lake Gas provides safe and reliable liquefied petroleum gas.",
    en: "Lake Gas Ltd. is East Africa's trusted LPG bottling and distribution company, operating across 6 countries. From domestic cooking to large-scale commercial kitchens and industrial applications, Lake Gas provides safe and reliable liquefied petroleum gas.",
    fr: "Lake Gas Ltd. est l'entreprise de confiance d'embouteillage et de distribution de GPL en Afrique de l'Est, présente dans 6 pays. De la cuisine domestique aux grandes cuisines commerciales et aux applications industrielles, Lake Gas fournit un gaz de pétrole liquéfié sûr et fiable.",
    sw: 'Lake Gas Ltd. ni kampuni ya kuaminika ya ujazaji na usambazaji wa gesi ya LPG Afrika Mashariki, ikifanya kazi katika nchi 6. Kuanzia mapishi ya nyumbani hadi jikoni kubwa za kibiashara na matumizi ya viwandani, Lake Gas hutoa gesi ya petroli iliyoyeyushwa iliyo salama na ya kuaminika.'
  },
  'lpg.49': { old: '7 Countries', en: '6 Countries', fr: '6 pays', sw: 'Nchi 6' },
  'services.12': {
    old: 'Lake Gas LPG bottling and distribution. 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use across 7 countries.',
    en: 'Lake Gas LPG bottling and distribution. 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use across 6 countries.',
    fr: 'Embouteillage et distribution de GPL Lake Gas. Bouteilles de 6 kg, 10 kg, 15 kg et 38 kg à usage domestique et commercial dans 6 pays.',
    sw: 'Ujazaji na usambazaji wa LPG wa Lake Gas. Mitungi ya kilo 6, 10, 15 na 38 kwa matumizi ya nyumbani na ya kibiashara katika nchi 6.'
  },
  'sustainability.13': {
    old: 'Lake Gas supplies LPG to 7 countries, displacing millions of charcoal cookstoves. Every cylinder sold reduces CO₂, indoor air pollution and deforestation pressure.',
    en: 'Lake Gas supplies LPG across 6 countries, helping households switch from charcoal to cleaner cooking. Every cylinder sold reduces CO₂, indoor air pollution and deforestation pressure.',
    fr: "Lake Gas fournit du GPL dans 6 pays, aidant les ménages à passer du charbon de bois à une cuisson plus propre. Chaque bouteille vendue réduit le CO₂, la pollution de l'air intérieur et la pression de déforestation.",
    sw: 'Lake Gas husambaza LPG katika nchi 6, ikisaidia kaya kuhama kutoka mkaa kwenda upishi safi zaidi. Kila mtungi unaouzwa hupunguza CO₂, uchafuzi wa hewa ndani ya nyumba na shinikizo la ukataji miti.'
  },
  'ose.s4.body': {
    old: 'Lake Gas now supplies LPG cylinders to seven countries, displacing charcoal stoves and giving families a safer way to cook.',
    en: 'Lake Gas now supplies LPG cylinders to six countries, displacing charcoal stoves and giving families a safer way to cook.',
    fr: 'Lake Gas fournit désormais des bouteilles de GPL dans six pays, remplaçant les foyers à charbon et offrant aux familles une façon plus sûre de cuisiner.',
    sw: 'Lake Gas sasa inasambaza mitungi ya LPG katika nchi sita, ikiondoa majiko ya mkaa na kuzipa familia njia salama zaidi ya kupika.'
  },
  'projects.42': { old: '7 Countries', en: '6 Countries', fr: '6 pays', sw: 'Nchi 6' },

  // ---- 2006 → 2026 is two decades, not 18 years ----
  'history.6': { old: '18 Years of Growth', en: 'Two Decades of Growth', fr: 'Deux décennies de croissance', sw: 'Miongo Miwili ya Ukuaji' },
  'ose.ending.eyebrow': { old: 'eighteen years in', en: 'two decades in', fr: 'deux décennies plus tard', sw: 'miongo miwili baadaye' },
  'investors.23': { old: '18yrs', en: '20yrs', fr: '20 ans', sw: 'miaka 20' },
  'investors.32': {
    old: 'From 1 company in 2006 to 20+ subsidiaries, a track record of disciplined expansion and value creation over 18 years.',
    en: 'From 1 company in 2006 to 20+ subsidiaries, a track record of disciplined expansion and value creation over nearly two decades.',
    fr: "D'une seule société en 2006 à plus de 20 filiales : un historique d'expansion disciplinée et de création de valeur sur près de deux décennies.",
    sw: 'Kutoka kampuni 1 mwaka 2006 hadi kampuni tanzu zaidi ya 20 — rekodi ya upanuzi wenye nidhamu na uundaji wa thamani kwa karibu miongo miwili.'
  },

  // ---- History timeline: dates & events corrected to verified record ----
  'history.10': { old: 'Logistics Division Launched', en: 'Logistics & First Regional Steps', fr: 'Logistique et premiers pas régionaux', sw: 'Usafirishaji na Hatua za Kwanza za Kikanda' },
  'history.11': {
    old: "Lake Trans Ltd. is established to handle bulk liquid haulage, rapidly expanding the Group's logistics footprint across Tanzania.",
    en: "Lake Trans Ltd. is established as the Group's logistics arm. The same year, DRC Petroleum S.A.R.L. is founded in the Democratic Republic of Congo and Lake Petroleum Ltd. is incorporated in Zambia — the Group's first ventures beyond Tanzania.",
    fr: "Lake Trans Ltd. est créée comme branche logistique du Groupe. La même année, DRC Petroleum S.A.R.L. est fondée en République démocratique du Congo et Lake Petroleum Ltd. est constituée en Zambie — les premières implantations du Groupe hors de Tanzanie.",
    sw: 'Lake Trans Ltd. inaanzishwa kama tawi la usafirishaji la Kundi. Mwaka huo huo, DRC Petroleum S.A.R.L. inaanzishwa katika Jamhuri ya Kidemokrasia ya Kongo na Lake Petroleum Ltd. inasajiliwa nchini Zambia — hatua za kwanza za Kundi nje ya Tanzania.'
  },
  'history.14': { old: 'Regional Expansion Begins', en: 'East African Footprint Grows', fr: "L'empreinte est-africaine s'étend", sw: 'Uwepo Afrika Mashariki Wapanuka' },
  'history.15': {
    old: 'Lake Group expands operations into Kenya, Zambia, Burundi and Rwanda, bringing fuel, LPG and lubricants to neighbouring markets.',
    en: 'Burundi Petroleum opens its first petrol station in Burundi, and Lake Petroleum Rwanda — established in Kigali in 2011 — begins importing and distributing fuel across Rwanda.',
    fr: 'Burundi Petroleum ouvre sa première station-service au Burundi, et Lake Petroleum Rwanda — créée à Kigali en 2011 — commence à importer et distribuer du carburant à travers le Rwanda.',
    sw: 'Burundi Petroleum inafungua kituo chake cha kwanza cha mafuta nchini Burundi, na Lake Petroleum Rwanda — iliyoanzishwa Kigali mwaka 2011 — inaanza kuagiza na kusambaza mafuta kote Rwanda.'
  },
  'history.16': { old: 'Lake Steel Launched', en: 'Lubricants & Composite Cylinders', fr: 'Lubrifiants et bouteilles composites', sw: 'Vilainishi na Mitungi ya Komposi' },
  'history.17': {
    old: 'Lake Steel Ltd. becomes the first company in Tanzania to introduce High Strength, Corrosion Resistant (HS-CR) reinforcement steel bars. A fully computerised rolling mill with 100,000 MT/yr capacity.',
    en: "Lake Lubes Ltd. is established in Dar es Salaam to blend and market the Group's own lubricants, and Lake Gas launches Africa's first composite LPG cylinders — non-explosive, lightweight and translucent.",
    fr: "Lake Lubes Ltd. est créée à Dar es Salaam pour formuler et commercialiser les lubrifiants du Groupe, et Lake Gas lance les premières bouteilles de GPL composites d'Afrique — non explosives, légères et translucides.",
    sw: 'Lake Lubes Ltd. inaanzishwa Dar es Salaam kuchanganya na kuuza vilainishi vya Kundi, na Lake Gas inazindua mitungi ya kwanza ya LPG ya komposi barani Afrika — isiyolipuka, nyepesi na inayopitisha mwanga.'
  },
  'history.18': { old: 'DRC & Ethiopia Entry', en: 'Kenya Entry at Scale', fr: 'Entrée à grande échelle au Kenya', sw: 'Kuingia Kenya kwa Kiwango Kikubwa' },
  'history.19': {
    old: "DRC Petroleum Ltd. and Wadi Elsundus Petroleum Co. (Ethiopia) are established, bringing the Group's operational footprint to 7 countries.",
    en: "The Competition Authority of Kenya approves Lake Oil's acquisition of Hashi Energy's Kenyan fuel-station network — a landmark step into East Africa's largest retail fuel market.",
    fr: "L'Autorité de la concurrence du Kenya approuve l'acquisition par Lake Oil du réseau de stations-service kenyan de Hashi Energy — une étape majeure sur le plus grand marché de détail de carburant d'Afrique de l'Est.",
    sw: 'Mamlaka ya Ushindani ya Kenya inaidhinisha Lake Oil kununua mtandao wa vituo vya mafuta vya Hashi Energy nchini Kenya — hatua muhimu katika soko kubwa zaidi la rejareja la mafuta Afrika Mashariki.'
  },
  'history.20': { old: 'Container Depot & Dubai Expansion', en: 'Tanga LPG Terminal', fr: 'Terminal GPL de Tanga', sw: 'Kituo cha LPG cha Tanga' },
  'history.21': {
    old: "AFICD (African Inland Container Depot) is launched in Tanzania and Zambia. MERM (Middle East Ready Mix LLC) is established in Dubai, marking the Group's first presence outside Africa.",
    en: "Lake Gas invests in Tanga, commissioning what opens as East Africa's largest LPG storage terminal — 1,000 MT of capacity, receiving ships through a dedicated single point mooring buoy.",
    fr: "Lake Gas investit à Tanga et met en service ce qui devient à son ouverture le plus grand terminal de stockage de GPL d'Afrique de l'Est — 1 000 tonnes de capacité, recevant les navires via une bouée d'amarrage dédiée.",
    sw: 'Lake Gas inawekeza Tanga na kuanzisha kituo kilichofunguliwa kikiwa kikubwa zaidi cha kuhifadhi LPG Afrika Mashariki — uwezo wa tani 1,000, kikipokea meli kupitia boya maalum la kufungia meli.'
  },
  'history.22': { old: '4,000+ Employees Milestone', en: 'Lake Steel Begins Production', fr: 'Lake Steel démarre sa production', sw: 'Lake Steel Yaanza Uzalishaji' },
  'history.23': {
    old: 'Lake Group surpasses 4,000 employees across 20+ subsidiaries, with 21 nationalities represented in the workforce. Mozambique operations begin.',
    en: 'Lake Steel and Allied Products starts operations at Visiga, Kibaha — the first producer of high-strength, corrosion-resistant (HS-CR) rebar in Tanzania, with an annual capacity of 100,000 metric tonnes.',
    fr: "Lake Steel and Allied Products démarre ses activités à Visiga, Kibaha — premier producteur de barres d'armature à haute résistance et anticorrosion (HS-CR) en Tanzanie, avec une capacité annuelle de 100 000 tonnes.",
    sw: 'Lake Steel and Allied Products inaanza shughuli zake Visiga, Kibaha — mzalishaji wa kwanza wa nondo imara zenye ukinzani wa kutu (HS-CR) nchini Tanzania, na uwezo wa tani 100,000 kwa mwaka.'
  },
  'history.24': { old: 'Composite LPG Cylinders Launched', en: 'Recognition & LPG Expansion', fr: 'Reconnaissance et expansion du GPL', sw: 'Tuzo na Upanuzi wa LPG' },
  'history.25': {
    old: "Lake Gas launches innovative composite cylinders in Dar es Salaam, non-explosive, non-corrosive, lightweight and translucent, a revolution for East Africa's cooking fuel market.",
    en: 'The Tanga LPG terminal is expanded to 3,000 MT, and founder Ally Edha Awadh is named Young Business Leader of the Year by the African Leadership Magazine.',
    fr: "Le terminal GPL de Tanga est porté à 3 000 tonnes, et le fondateur Ally Edha Awadh est nommé Jeune dirigeant d'entreprise de l'année par l'African Leadership Magazine.",
    sw: 'Kituo cha LPG cha Tanga kinapanuliwa hadi tani 3,000, na mwanzilishi Ally Edha Awadh anatunukiwa tuzo ya Kiongozi Kijana wa Biashara wa Mwaka na jarida la African Leadership.'
  },

  // ---- Fuel: no verified aviation fuel business; bunkering is verified ----
  'fuel.8': {
    old: 'We supply white petroleum products including petrol, diesel and aviation fuel through retail stations, bulk delivery and strategic storage facilities across the region.',
    en: 'We supply white petroleum products — petrol and diesel — through retail stations, bulk delivery and strategic storage facilities across the region, and provide bunkering services for vessels calling at the port of Dar es Salaam.',
    fr: 'Nous fournissons des produits pétroliers blancs — essence et diesel — via des stations-service, la livraison en vrac et des installations de stockage stratégiques dans toute la région, et assurons des services de soutage pour les navires faisant escale au port de Dar es Salaam.',
    sw: 'Tunasambaza bidhaa nyeupe za petroli — petroli na dizeli — kupitia vituo vya rejareja, usambazaji wa jumla na maghala ya kimkakati kote kanda, na kutoa huduma za kujaza mafuta meli zinazotia nanga katika bandari ya Dar es Salaam.'
  },

  // ---- Fleet: official tanker capacity is 12,000–40,000 litres ----
  'fleet.13': {
    old: 'Heavy-duty tankers for bulk liquid petroleum transport. Capacity from 30,000 to 60,000 litres. GPS tracking and full hazmat certification.',
    en: 'Heavy-duty tankers for bulk liquid petroleum transport, with capacities from 12,000 to 40,000 litres. Every tanker is GPS-tracked and operated under full regulatory licensing.',
    fr: "Camions-citernes robustes pour le transport de produits pétroliers en vrac, d'une capacité de 12 000 à 40 000 litres. Chaque citerne est suivie par GPS et exploitée avec toutes les licences réglementaires.",
    sw: 'Malori makubwa ya matangi kwa usafirishaji wa mafuta kwa wingi, yenye uwezo wa lita 12,000 hadi 40,000. Kila tanki linafuatiliwa kwa GPS na linaendeshwa kwa leseni kamili za kisheria.'
  },
  'fleet.14': { old: '30–60k litres', en: '12–40k litres', fr: '12–40 k litres', sw: 'Lita 12,000–40,000' },
  'fleet.16': { old: 'Hazmat Certified', en: 'Fully Licensed', fr: 'Entièrement agréé', sw: 'Leseni Kamili' },
  'fleet.23': { old: 'Pressure Certified', en: 'Bulk & Cylinder Delivery', fr: 'Livraison en vrac et en bouteilles', sw: 'Usambazaji wa Jumla na Mitungi' },
  'fleet.24': { old: 'ADR Compliant', en: 'GPS Tracked', fr: 'Suivi GPS', sw: 'Ufuatiliaji wa GPS' },

  // ---- CSR: replace unverifiable/invented pillars with verified CSR record ----
  'csr.13': { old: 'ISO-aligned environmental practices', en: 'Responsible environmental practices', fr: 'Pratiques environnementales responsables', sw: 'Mazoea ya uwajibikaji kwa mazingira' },
  'csr.14': { old: 'Education', en: 'Community', fr: 'Communauté', sw: 'Jamii' },
  'csr.15': { old: 'Scholarships and skills programmes', en: 'Health, orphan care and relief donations', fr: 'Dons pour la santé, les orphelins et les secours', sw: 'Misaada ya afya, yatima na dharura' },
  'csr.18': { old: 'Education & Skills', en: 'Healthcare Support', fr: 'Soutien aux soins de santé', sw: 'Kusaidia Huduma za Afya' },
  'csr.19': {
    old: 'Supporting scholarships, vocational training and STEM education for youth in Tanzania and across the region, building the next generation of energy professionals.',
    en: "Donating medical equipment to maternal wards in Dar es Salaam's municipal hospitals — delivery beds, delivery kits, wheelchairs, stretchers and BP machines — and supporting referral hospitals such as Temeke.",
    fr: "Don d'équipements médicaux aux maternités des hôpitaux municipaux de Dar es Salaam — lits d'accouchement, kits d'accouchement, fauteuils roulants, brancards et tensiomètres — et soutien aux hôpitaux de référence comme Temeke.",
    sw: 'Kutoa vifaa tiba kwa wodi za wazazi katika hospitali za manispaa za Dar es Salaam — vitanda vya kujifungulia, vifaa vya kujifungulia, viti vya magurudumu, machela na mashine za kupima presha — na kusaidia hospitali za rufaa kama Temeke.'
  },
  'csr.20': { old: 'Community Infrastructure', en: 'Children & Community Welfare', fr: 'Enfance et bien-être communautaire', sw: 'Watoto na Ustawi wa Jamii' },
  'csr.21': {
    old: 'Contributing to the construction and renovation of community facilities, roads, water points, health clinics and public amenities in operational areas.',
    en: 'Assisting needy children and orphanage centres, supporting places of worship, and providing emergency relief — including food and LPG cooking sets for flood-affected families in Rufiji.',
    fr: "Aide aux enfants démunis et aux orphelinats, soutien aux lieux de culte et secours d'urgence — notamment des vivres et des kits de cuisson au GPL pour les familles touchées par les inondations à Rufiji.",
    sw: 'Kusaidia watoto wenye uhitaji na vituo vya yatima, kuunga mkono nyumba za ibada, na kutoa msaada wa dharura — ikiwemo chakula na mitungi ya gesi ya kupikia kwa familia zilizoathiriwa na mafuriko Rufiji.'
  },
  'csr.23': {
    old: 'Responsible handling of petroleum products, zero-tolerance for spillage, and progressive adoption of cleaner operations. Active reclamation of quarry land at Lugoba.',
    en: 'Responsible handling, storage and transport of petroleum products across the supply chain, with continuous investment in modern equipment and cleaner operations.',
    fr: "Manipulation, stockage et transport responsables des produits pétroliers tout au long de la chaîne d'approvisionnement, avec un investissement continu dans des équipements modernes et des opérations plus propres.",
    sw: 'Ushughulikiaji, uhifadhi na usafirishaji wa uwajibikaji wa bidhaa za petroli katika mnyororo mzima wa ugavi, pamoja na uwekezaji endelevu katika vifaa vya kisasa na shughuli safi zaidi.'
  },
  'csr.26': { old: 'Food Security', en: 'Clean Cooking Access', fr: 'Accès à la cuisson propre', sw: 'Upatikanaji wa Nishati Safi ya Kupikia' },
  'csr.27': {
    old: 'Supporting reliable LPG access for households across East Africa, reducing dependence on charcoal, improving air quality and lowering deforestation pressure.',
    en: 'Expanding reliable LPG access for households across East Africa — reducing dependence on charcoal, improving indoor air quality and easing deforestation pressure.',
    fr: "Élargir l'accès fiable au GPL pour les ménages d'Afrique de l'Est — réduire la dépendance au charbon de bois, améliorer la qualité de l'air intérieur et alléger la pression de déforestation.",
    sw: 'Kupanua upatikanaji wa uhakika wa LPG kwa kaya Afrika Mashariki — kupunguza utegemezi wa mkaa, kuboresha hewa ndani ya nyumba na kupunguza shinikizo la ukataji miti.'
  },

  // ---- Sustainability: soften unverifiable claims, use verified facts ----
  'sustainability.14': { old: 'Zero Spillage Policy', en: 'Spillage Prevention', fr: 'Prévention des déversements', sw: 'Kuzuia Umwagikaji' },
  'sustainability.15': {
    old: 'All petroleum transport operations are governed by strict zero-tolerance spillage protocols. Our tanker fleet is regularly inspected and certified.',
    en: "Petroleum transport operations are run with a zero-spillage ambition. Tankers are regularly inspected and maintained at the Group's own workshops in Kibaha, Kigamboni and Morogoro.",
    fr: 'Les opérations de transport pétrolier visent zéro déversement. Les citernes sont régulièrement inspectées et entretenues dans les ateliers du Groupe à Kibaha, Kigamboni et Morogoro.',
    sw: 'Shughuli za usafirishaji wa mafuta zinaendeshwa kwa lengo la kutomwaga mafuta kabisa. Matangi hukaguliwa mara kwa mara na kufanyiwa matengenezo katika karakana za Kundi zilizoko Kibaha, Kigamboni na Morogoro.'
  },
  'sustainability.16': { old: 'Quarry Land Reclamation', en: 'Quarry Stewardship', fr: 'Gestion responsable de la carrière', sw: 'Usimamizi wa Machimbo' },
  'sustainability.17': {
    old: "GCCP's quarry operations at Lugoba include progressive land rehabilitation, restoring extracted areas to usable agricultural and ecological land.",
    en: "GCCP's quarry at Lugoba supplies aggregate for the Group's concrete operations. We are committed to responsible extraction and to progressively rehabilitating worked-out areas.",
    fr: "La carrière de GCCP à Lugoba fournit les granulats des activités béton du Groupe. Nous nous engageons à une extraction responsable et à la réhabilitation progressive des zones exploitées.",
    sw: 'Machimbo ya GCCP huko Lugoba hutoa kokoto kwa shughuli za zege za Kundi. Tumejizatiti kuchimba kwa uwajibikaji na kurekebisha hatua kwa hatua maeneo yaliyokwisha chimbwa.'
  },

  // ---- Leadership ----
  'leadership.13': {
    old: 'Under his leadership the Group has expanded into Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Cement & Concrete Products, African Inland Container Depot and regional oil storage and retail networks.',
    en: 'Under his leadership the Group has expanded into Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Concrete & Cement Products, African Inland Container Depot and regional oil storage and retail networks. In 2023 he was also named Young African Energy Leader of the Year at the African Business Leadership Awards.',
    fr: "Sous sa direction, le Groupe s'est étendu à Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Concrete & Cement Products, African Inland Container Depot ainsi qu'à des réseaux régionaux de stockage et de distribution de carburant. En 2023, il a également été nommé Jeune leader africain de l'énergie de l'année aux African Business Leadership Awards.",
    sw: 'Chini ya uongozi wake, Kundi limepanuka na kuwa na Lake Trans, Lake Gas, Lake Lubes, Lake Steel, Gulf Concrete & Cement Products, African Inland Container Depot pamoja na mitandao ya kikanda ya kuhifadhi mafuta na rejareja. Mwaka 2023 alitunukiwa pia tuzo ya Kiongozi Kijana wa Nishati Afrika wa Mwaka katika African Business Leadership Awards.'
  },
  'leadership.33': {
    old: "Flagship petroleum importer, depot operator and retail network, Tanzania's top fuel distributors. MD: Abdulrahman Mohamed",
    en: "Flagship petroleum importer, depot operator and retail network — among Tanzania's top five fuel distributors. MD: Abdulrahman Mohamed",
    fr: 'Importateur pétrolier phare, exploitant de dépôts et réseau de détail — parmi les cinq premiers distributeurs de carburant de Tanzanie. DG : Abdulrahman Mohamed',
    sw: 'Kampuni kiongozi ya uagizaji wa mafuta, uendeshaji wa maghala na mtandao wa rejareja — miongoni mwa wasambazaji watano wakubwa wa mafuta Tanzania. MD: Abdulrahman Mohamed'
  },
  'leadership.42': { old: 'Gulf Cement & Concrete Products (GCCP)', en: 'Gulf Concrete & Cement Products (GCCP)', fr: 'Gulf Concrete & Cement Products (GCCP)', sw: 'Gulf Concrete & Cement Products (GCCP)' },

  // ---- Africa network ----
  'africa_network.54': { old: 'SAFF: Aggregates', en: 'SAFF: Freight Forwarding & Shipping', fr: 'SAFF : Transit et expédition de fret', sw: 'SAFF: Uwakala wa Mizigo na Usafirishaji' },
  'africa_network.92': {
    old: 'One of the largest premix concrete plants in the UAE, serving major Dubai construction projects.',
    en: "One of Lake Group's largest premix concrete operations, serving major construction projects in Dubai.",
    fr: "L'une des plus grandes activités de béton prêt à l'emploi du Groupe Lake, au service de grands projets de construction à Dubaï.",
    sw: 'Mojawapo ya shughuli kubwa zaidi za zege iliyochanganywa tayari za Kundi la Lake, ikihudumia miradi mikubwa ya ujenzi Dubai.'
  },

  // ---- Projects: replace unverified JNHPP claim with verified Tanga terminal ----
  'projects.10': {
    old: 'Julius Nyerere Hydropower – Concrete Supply',
    en: "Tanga LPG Import Terminal — East Africa's Largest",
    fr: "Terminal d'importation de GPL de Tanga — le plus grand d'Afrique de l'Est",
    sw: 'Kituo cha Kuagiza LPG cha Tanga — Kikubwa Zaidi Afrika Mashariki'
  },
  'projects.11': {
    old: "GCCP supplied specialist high-performance ready-mix concrete to support civil works on Tanzania's flagship 2,115 MW Julius Nyerere Hydropower Project at Stiegler's Gorge.",
    en: "Lake Gas built East Africa's largest LPG storage terminal at Tanga — commissioned at 1,000 MT and later expanded to 3,000 MT — with a dedicated single point mooring buoy that lets ships discharge directly to the terminal.",
    fr: "Lake Gas a construit à Tanga le plus grand terminal de stockage de GPL d'Afrique de l'Est — mis en service à 1 000 tonnes puis porté à 3 000 tonnes — doté d'une bouée d'amarrage dédiée permettant aux navires de décharger directement vers le terminal.",
    sw: 'Lake Gas ilijenga kituo kikubwa zaidi cha kuhifadhi LPG Afrika Mashariki huko Tanga — kilichoanzishwa kwa tani 1,000 na baadaye kupanuliwa hadi tani 3,000 — chenye boya maalum la kufungia meli linaloruhusu meli kushusha gesi moja kwa moja kituoni.'
  },
  'projects.13': { old: 'Concrete & Aggregate', en: 'LPG Gas', fr: 'GPL', sw: 'Gesi ya LPG' },
  'projects.23': {
    old: "Tanzania's first HS-CR rebar producer. The fully computerised 25T/hr rolling mill has supplied 100,000+ MT of high-strength corrosion-resistant steel to the construction sector.",
    en: "Tanzania's first HS-CR rebar producer. The fully computerised rolling mill at Visiga, Kibaha runs at up to 25 tonnes per hour — 100,000 MT annual capacity — and its bars are approved for use in government projects.",
    fr: "Premier producteur tanzanien de barres d'armature HS-CR. Le laminoir entièrement informatisé de Visiga, Kibaha, tourne jusqu'à 25 tonnes par heure — soit 100 000 tonnes de capacité annuelle — et ses barres sont approuvées pour les projets gouvernementaux.",
    sw: 'Mzalishaji wa kwanza wa nondo za HS-CR Tanzania. Kinu cha kusaga chuma kinachoendeshwa kikamilifu kwa kompyuta huko Visiga, Kibaha, hufanya kazi hadi tani 25 kwa saa — uwezo wa tani 100,000 kwa mwaka — na nondo zake zimeidhinishwa kutumika katika miradi ya serikali.'
  },
  'projects.29': {
    old: "Middle East Ready Mix LLC (MERM), Lake Group's Dubai-based premix concrete operation, is one of the largest ready-mix plants in the UAE, serving major construction projects.",
    en: "Middle East Ready Mix LLC (MERM), Lake Group's Dubai-based premix concrete operation, has been producing ready-mix concrete since 2005 and serves major construction projects across Dubai.",
    fr: "Middle East Ready Mix LLC (MERM), l'activité de béton prêt à l'emploi du Groupe Lake basée à Dubaï, produit du béton depuis 2005 et dessert de grands projets de construction dans tout Dubaï.",
    sw: 'Middle East Ready Mix LLC (MERM), shughuli ya zege iliyochanganywa tayari ya Kundi la Lake iliyoko Dubai, imekuwa ikizalisha zege tangu 2005 na huhudumia miradi mikubwa ya ujenzi kote Dubai.'
  },

  // ---- Gallery ----
  'gallery.45': {
    old: 'MERM: One of the Largest Premix Plants in the UAE',
    en: "MERM: One of Lake Group's Largest Premix Plants",
    fr: "MERM : l'une des plus grandes centrales à béton du Groupe Lake",
    sw: 'MERM: Mojawapo ya Mitambo Mikubwa ya Zege ya Kundi la Lake'
  },

  // ---- Lubricants: no verified marine line; specialty products are official ----
  'lubricants.16': { old: 'Marine Lubricants', en: 'Specialty Products', fr: 'Produits spécialisés', sw: 'Bidhaa Maalum' },
  'lubricants.17': {
    old: 'Specialist marine engine oils and gear lubricants for Lake Victoria and coastal vessels.',
    en: 'Gear oils, automatic transmission fluid, radiator coolants, hydraulic oils and lithium greases for specialist applications.',
    fr: 'Huiles pour engrenages, fluide de transmission automatique, liquides de refroidissement, huiles hydrauliques et graisses au lithium pour applications spécialisées.',
    sw: 'Mafuta ya gia, mafuta ya giaboksi otomatiki, vipoza-radieta, mafuta ya hidroliki na grisi za lithiamu kwa matumizi maalum.'
  },

  // ---- Concrete: batching plant count not officially published ----
  'concrete.20': {
    old: '<span style="color:var(--amber);font-weight:700">✓</span>2x Sany International fully-automatic batching plants',
    en: '<span style="color:var(--amber);font-weight:700">✓</span>Fully-automatic Sany International batching plants',
    fr: '<span style="color:var(--amber);font-weight:700">✓</span>Centrales à béton entièrement automatiques Sany International',
    sw: '<span style="color:var(--amber);font-weight:700">✓</span>Mitambo ya kuchanganyia zege inayojiendesha kikamilifu ya Sany International'
  },

  // ---- Media center: replace invented press releases with verified news ----
  'media_center.8': { old: 'Dec 10, 2024', en: 'July 2022', fr: 'Juillet 2022', sw: 'Julai 2022' },
  'media_center.9': {
    old: 'Lake Group Announces Expansion into Mozambique with New Fuel Depot and AFICD Operations',
    en: 'Ally Edha Awadh Named Young Business Leader of the Year',
    fr: "Ally Edha Awadh nommé Jeune dirigeant d'entreprise de l'année",
    sw: 'Ally Edha Awadh Atunukiwa Tuzo ya Kiongozi Kijana wa Biashara wa Mwaka'
  },
  'media_center.10': {
    old: 'Lake Group has formally inaugurated its Mozambique operations, establishing Lake Oil LDA and an AFICD inland container depot to serve growing trade flows along the Beira corridor.',
    en: "Lake Group founder and Chairman Ally Edha Awadh received the African Leadership Magazine's 2022 Young Business Leader of the Year award at a ceremony held at the House of Lords in London.",
    fr: "Le fondateur et président du Groupe Lake, Ally Edha Awadh, a reçu le prix du Jeune dirigeant d'entreprise de l'année 2022 de l'African Leadership Magazine lors d'une cérémonie à la Chambre des Lords à Londres.",
    sw: 'Mwanzilishi na Mwenyekiti wa Kundi la Lake, Ally Edha Awadh, alipokea tuzo ya Kiongozi Kijana wa Biashara wa Mwaka 2022 ya jarida la African Leadership katika hafla iliyofanyika katika Ukumbi wa House of Lords, London.'
  },
  'media_center.13': { old: 'Nov 5, 2024', en: '2022', fr: '2022', sw: '2022' },
  'media_center.14': {
    old: 'Lake Steel Reaches Cumulative 500,000 MT Production Milestone',
    en: 'Lake Gas Expands Tanga LPG Terminal to 3,000 Metric Tonnes',
    fr: 'Lake Gas porte le terminal GPL de Tanga à 3 000 tonnes',
    sw: 'Lake Gas Yapanua Kituo cha LPG cha Tanga hadi Tani 3,000'
  },
  'media_center.15': {
    old: "Tanzania's first HS-CR rebar manufacturer, Lake Steel Ltd., has celebrated a major production milestone, 500,000 metric tonnes of high-strength corrosion-resistant rebars since commissioning.",
    en: "Lake Gas has expanded its Tanga terminal — opened as East Africa's largest LPG storage facility — from 1,000 to 3,000 metric tonnes, strengthening supply to Tanzania and neighbouring markets.",
    fr: "Lake Gas a agrandi son terminal de Tanga — inauguré comme la plus grande installation de stockage de GPL d'Afrique de l'Est — de 1 000 à 3 000 tonnes, renforçant l'approvisionnement de la Tanzanie et des marchés voisins.",
    sw: 'Lake Gas imepanua kituo chake cha Tanga — kilichofunguliwa kikiwa ghala kubwa zaidi la kuhifadhi LPG Afrika Mashariki — kutoka tani 1,000 hadi tani 3,000, ikiimarisha usambazaji Tanzania na masoko jirani.'
  },
  'media_center.18': { old: 'Oct 1, 2024', en: 'June 2014', fr: 'Juin 2014', sw: 'Juni 2014' },
  'media_center.19': {
    old: 'Lake Group Workforce Exceeds 4,600 Employees Across 8 Countries',
    en: "Lake Gas Launches Africa's First Composite LPG Cylinders",
    fr: "Lake Gas lance les premières bouteilles de GPL composites d'Afrique",
    sw: 'Lake Gas Yazindua Mitungi ya Kwanza ya LPG ya Komposi Afrika'
  },
  'media_center.20': {
    old: 'Lake Group has reported continued workforce growth, now employing over 4,600 professionals across 20+ subsidiaries in 8 countries, representing 21 nationalities.',
    en: 'Lake Gas introduced composite LPG cylinders — non-explosive, non-corrosive, lightweight and translucent — at a launch event in Dar es Salaam on 18 June 2014, a first for the African market.',
    fr: 'Lake Gas a présenté les bouteilles de GPL composites — non explosives, anticorrosion, légères et translucides — lors d\'un lancement à Dar es Salaam le 18 juin 2014, une première sur le marché africain.',
    sw: 'Lake Gas ilizindua mitungi ya LPG ya komposi — isiyolipuka, isiyoshika kutu, nyepesi na inayopitisha mwanga — katika hafla ya uzinduzi Dar es Salaam tarehe 18 Juni 2014, ya kwanza katika soko la Afrika.'
  },
  'media_center.11': { old: 'Download PDF', en: 'Read more', fr: 'Lire la suite', sw: 'Soma zaidi' },
  'media_center.16': { old: 'Download PDF', en: 'Read more', fr: 'Lire la suite', sw: 'Soma zaidi' },
  'media_center.21': { old: 'Download PDF', en: 'Read more', fr: 'Lire la suite', sw: 'Soma zaidi' },
  'media_center.25': { old: 'media@lakeoilgroup.com', en: 'admin@lakeoilgroup.com', fr: 'admin@lakeoilgroup.com', sw: 'admin@lakeoilgroup.com' },
  'media_center.26': { old: 'Response within 1 business day', en: 'Monday – Friday, 9:00 – 18:00 EAT', fr: 'Lundi – vendredi, 9 h – 18 h (EAT)', sw: 'Jumatatu – Ijumaa, 9:00 – 18:00 EAT' },

  // ---- News page ----
  'news.4': {
    old: "What's happening at announcements, expansions, product launches and community activities.",
    en: 'News from across Lake Group — announcements, expansions, product launches and community activities.',
    fr: 'Les actualités du Groupe Lake — annonces, expansions, lancements de produits et activités communautaires.',
    sw: 'Habari kutoka kote katika Kundi la Lake — matangazo, upanuzi, uzinduzi wa bidhaa na shughuli za kijamii.'
  },
  'news.20': { old: 'Upcoming Events', en: 'Event Highlights', fr: 'Temps forts des événements', sw: 'Matukio Muhimu' },
  'news.21': { old: 'Jan 2025', en: 'Jun 2014', fr: 'Juin 2014', sw: 'Juni 2014' },
  'news.22': { old: 'Tanzania Energy Forum 2025', en: 'Composite LPG Cylinder Launch', fr: 'Lancement des bouteilles GPL composites', sw: 'Uzinduzi wa Mitungi ya LPG ya Komposi' },
  'news.24': { old: 'Mar 2025', en: '2022', fr: '2022', sw: '2022' },
  'news.25': { old: 'East Africa Construction Expo', en: 'Tanga LPG Terminal Expansion', fr: 'Extension du terminal GPL de Tanga', sw: 'Upanuzi wa Kituo cha LPG cha Tanga' },
  'news.26': { old: 'Nairobi, Kenya', en: 'Tanga, Tanzania', fr: 'Tanga, Tanzanie', sw: 'Tanga, Tanzania' },

  // ---- Careers: replace invented vacancies with real hiring areas ----
  'careers.17': { old: 'Open Opportunities', en: 'Where We Hire', fr: 'Nos domaines de recrutement', sw: 'Maeneo Tunayoajiri' },
  'careers.18': { old: 'Petroleum Engineer', en: 'Engineering & Operations', fr: 'Ingénierie et opérations', sw: 'Uhandisi na Uendeshaji' },
  'careers.19': { old: 'Dar es Salaam, Tanzania', en: 'Depots, terminals & plants across the Group', fr: 'Dépôts, terminaux et usines du Groupe', sw: 'Maghala, vituo na viwanda vya Kundi' },
  'careers.21': { old: 'Logistics Coordinator', en: 'Logistics & Transport', fr: 'Logistique et transport', sw: 'Usafirishaji na Uchukuzi' },
  'careers.22': { old: 'Nairobi, Kenya', en: 'Tanzania, Kenya & Zambia', fr: 'Tanzanie, Kenya et Zambie', sw: 'Tanzania, Kenya na Zambia' },
  'careers.24': { old: 'Finance Manager', en: 'Finance & Administration', fr: 'Finance et administration', sw: 'Fedha na Utawala' },
  'careers.27': { old: 'Civil Engineer', en: 'Manufacturing & Industrial', fr: 'Industrie et fabrication', sw: 'Uzalishaji na Viwanda' },
  'careers.28': { old: 'Lusaka, Zambia', en: 'Steel, concrete & LPG plants', fr: 'Aciérie, béton et usines GPL', sw: 'Viwanda vya chuma, zege na LPG' },
  'careers.30': { old: 'Truck Driver (Class C)', en: 'Professional Drivers', fr: 'Chauffeurs professionnels', sw: 'Madereva Wataalamu' },

  // ---- Station locator: Lake Oil stations are officially open 24 hours ----
  'station_locator.4': {
    old: 'Locate the nearest Lake Oil fuel station, check opening hours and available services.',
    en: 'Locate the nearest Lake Oil fuel station and see the services available — Lake Oil stations are open 24 hours.',
    fr: 'Trouvez la station-service Lake Oil la plus proche et découvrez les services disponibles — les stations Lake Oil sont ouvertes 24h/24.',
    sw: 'Tafuta kituo cha mafuta cha Lake Oil kilicho karibu nawe na uone huduma zinazopatikana — vituo vya Lake Oil viko wazi saa 24.'
  },
  'station_locator.26': {
    old: 'Mon–Sun 6:00am – 10:00pm \u00a0|\u00a0 Petrol, Diesel, LPG',
    en: 'Open 24 hours \u00a0|\u00a0 Petrol, Diesel, LPG',
    fr: 'Ouvert 24h/24 \u00a0|\u00a0 Essence, diesel, GPL',
    sw: 'Wazi saa 24 \u00a0|\u00a0 Petroli, Dizeli, LPG'
  },
  'station_locator.30': {
    old: 'Mon–Sun 5:00am – 11:00pm \u00a0|\u00a0 Petrol, Diesel, Lubricants',
    en: 'Open 24 hours \u00a0|\u00a0 Petrol, Diesel, Lubricants',
    fr: 'Ouvert 24h/24 \u00a0|\u00a0 Essence, diesel, lubrifiants',
    sw: 'Wazi saa 24 \u00a0|\u00a0 Petroli, Dizeli, Vilainishi'
  },
  'station_locator.34': {
    old: 'Mon–Sun 6:00am – 10:00pm \u00a0|\u00a0 Petrol, Diesel, LPG',
    en: 'Open 24 hours \u00a0|\u00a0 Petrol, Diesel, LPG',
    fr: 'Ouvert 24h/24 \u00a0|\u00a0 Essence, diesel, GPL',
    sw: 'Wazi saa 24 \u00a0|\u00a0 Petroli, Dizeli, LPG'
  },
  'station_locator.38': {
    old: 'Mon–Sun 6:00am – 9:00pm \u00a0|\u00a0 Petrol, Diesel, Truck Diesel',
    en: 'Open 24 hours \u00a0|\u00a0 Petrol, Diesel, Truck Diesel',
    fr: 'Ouvert 24h/24 \u00a0|\u00a0 Essence, diesel, diesel poids lourds',
    sw: 'Wazi saa 24 \u00a0|\u00a0 Petroli, Dizeli, Dizeli ya Malori'
  },
  'station_locator.42': {
    old: 'Mon–Sun 5:30am – 10:00pm \u00a0|\u00a0 Petrol, Diesel, LPG',
    en: 'Open 24 hours \u00a0|\u00a0 Petrol, Diesel, LPG',
    fr: 'Ouvert 24h/24 \u00a0|\u00a0 Essence, diesel, GPL',
    sw: 'Wazi saa 24 \u00a0|\u00a0 Petroli, Dizeli, LPG'
  }
};

// Keys whose markup is being removed from pages entirely.
const DELETES = [
  'investors.5', 'investors.6', 'investors.7', 'investors.8', 'investors.9',
  'investors.12', 'investors.13', 'investors.14',
  'lpg.47', 'lpg.48'
];

function encodeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/\u00a0/g, '&nbsp;');
}

// ---- 1. dictionaries --------------------------------------------------------
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const problems = [];

for (const [key, e] of Object.entries(EDITS)) {
  if (!(key in content.en)) { problems.push(`MISSING KEY ${key}`); continue; }
  if (content.en[key] !== e.old) problems.push(`EN MISMATCH ${key}\n  expected: ${JSON.stringify(e.old)}\n  actual:   ${JSON.stringify(content.en[key])}`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

for (const [key, e] of Object.entries(EDITS)) {
  content.en[key] = e.en;
  content.fr[key] = e.fr;
  content.sw[key] = e.sw; // build_sw_lang.js will overwrite from chunks; keep consistent anyway
}
for (const key of DELETES) {
  delete content.en[key];
  delete content.fr[key];
  delete content.sw[key];
}
fs.writeFileSync(JSON_PATH, JSON.stringify(content, null, 2), 'utf8');
console.log('i18n-content.json updated:', Object.keys(EDITS).length, 'edits,', DELETES.length, 'deletions');

// ---- 2. sw chunks -----------------------------------------------------------
const chunkPaths = [1, 2, 3, 4].map(i => path.join(__dirname, `_sw_out_${i}.json`));
const chunks = chunkPaths.map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
const unplaced = [];
for (const [key, e] of Object.entries(EDITS)) {
  let placed = false;
  for (const chunk of chunks) {
    if (key in chunk) { chunk[key] = e.sw; placed = true; break; }
  }
  if (!placed) unplaced.push(key);
}
for (const key of DELETES) {
  for (const chunk of chunks) delete chunk[key];
}
if (unplaced.length) { console.error('Keys not found in any sw chunk:', unplaced); process.exit(1); }
chunkPaths.forEach((p, i) => fs.writeFileSync(p, JSON.stringify(chunks[i], null, 2) + '\n', 'utf8'));
console.log('sw chunks updated.');

// ---- 3. HTML defaults -------------------------------------------------------
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const fileText = {};
for (const f of htmlFiles) fileText[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Turns an expected inner-text into a whitespace-tolerant regex source.
function flexPattern(s) {
  return escapeRegex(s).replace(/\s+/g, '\\s+');
}

const notReplaced = [];
for (const [key, e] of Object.entries(EDITS)) {
  const variants = [...new Set([e.old, encodeHtml(e.old)])];
  const replacementFor = v => (v === e.old ? e.en : encodeHtml(e.en));
  let hits = 0;
  for (const f of htmlFiles) {
    if (!fileText[f].includes(`data-i18n="${key}"`)) continue;
    for (const v of variants) {
      // Anchor the old text to the element carrying this data-i18n key.
      const re = new RegExp(`(data-i18n="${escapeRegex(key)}"[^>]*>)${flexPattern(v)}(<)`);
      if (re.test(fileText[f])) {
        fileText[f] = fileText[f].replace(re, (m, pre, post) => pre + replacementFor(v) + post);
        hits++;
        break;
      }
    }
  }
  if (hits === 0) notReplaced.push(key);
}
for (const f of htmlFiles) fs.writeFileSync(path.join(ROOT, f), fileText[f], 'utf8');
console.log('HTML defaults updated.');
if (notReplaced.length) console.warn('MANUAL FOLLOW-UP needed (old text not found verbatim in HTML):', notReplaced);
