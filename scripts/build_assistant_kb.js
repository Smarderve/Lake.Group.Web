#!/usr/bin/env node
/**
 * Builds assets/assistant-kb.js - the offline knowledge base consumed by
 * assets/assistant.js (the site's offline knowledge assistant).
 *
 * Output shape (same "global payload via plain <script>" pattern as
 * assets/i18n-content.js, so it works under file:// as well as http(s)://):
 *
 *   window.__LAKE_ASSISTANT_KB__ = {
 *     version: 1,
 *     langs: {
 *       en: { docs: [ { id, t, s, u, k, f } ] },   // t=title, s=text,
 *       fr: { ... },                                // u=page url, k=extra
 *       sw: { ... }                                 // keywords, f=1 curated
 *     }                                             //   fact (rank boost)
 *   }
 *
 * Sources:
 *   1. assets/i18n-content.json - every page's translated copy, grouped by
 *      key prefix (one prefix per page) and chunked into small documents so
 *      retrieval returns a focused passage, not a whole page.
 *   2. CURATED_FACTS below - hand-written from scripts/_verified_lake_facts.md
 *      (verified items only; conflicting official figures use the preferred
 *      "about page" number, e.g. 1,200+ trucks).
 *
 * Run from repo root:  node scripts/build_assistant_kb.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets', 'i18n-content.json'), 'utf8')
);
const OUT = path.join(ROOT, 'assets', 'assistant-kb.js');

const LANGS = ['en', 'fr', 'sw', 'hi', 'ar'];

/* ------------------------------------------------------------------ */
/* Page map: i18n key prefix -> page url + title                       */
/* ------------------------------------------------------------------ */
// titleKey points into the i18n dictionary so page titles are translated
// for free; `title` is the English fallback if the key is missing.
const PAGES = {
  index: { url: 'index.html', titleKey: 'nav.home', title: 'Home' },
  hero: { url: 'index.html', titleKey: 'nav.home', title: 'Home' },
  stat: { url: 'index.html', titleKey: 'nav.home', title: 'Home' },
  about: { url: 'about.html', titleKey: 'nav.about', title: 'About Us' },
  ose: { url: 'our-story.html', titleKey: 'nav.about', title: 'Our Story' },
  history: { url: 'history.html', titleKey: 'nav.history', title: 'Our History' },
  leadership: { url: 'leadership.html', titleKey: 'nav.leadership', title: 'Leadership' },
  services: { url: 'services.html', titleKey: 'nav.companies', title: 'Subsidiaries' },
  fuel: { url: 'lake-oil.html', titleKey: 'nav.co.lakeOil', title: 'Lake Oil' },
  lpg: { url: 'lake-gas.html', titleKey: 'nav.co.lakeGas', title: 'Lake Gas' },
  lubricants: { url: 'lake-lubes.html', titleKey: 'nav.co.lakeLubes', title: 'Lake Lubes' },
  steel: { url: 'lake-steel.html', titleKey: 'nav.co.lakeSteel', title: 'Lake Steel' },
  concrete: { url: 'lake-premix-cement.html', titleKey: 'nav.co.lakePremixCement', title: 'Lake Premix & Cement' },
  logistics: { url: 'lake-trans.html', titleKey: 'nav.co.lakeTrans', title: 'Lake Trans' },
  container_services: { url: 'aficd.html', titleKey: 'nav.co.aficd', title: 'AFICD' },
  africa_network: { url: 'africa-network.html', titleKey: 'nav.africaMap', title: 'Africa Operations Map' },
  station_locator: { url: 'station-locator.html', titleKey: 'nav.stations', title: 'Station Locator' },
  fleet: { url: 'fleet.html', titleKey: 'nav.fleet', title: 'Our Fleet' },
  careers: { url: 'careers.html', titleKey: 'nav.careers', title: 'Careers' },
  csr: { url: 'csr.html', titleKey: 'nav.csr', title: 'CSR & Sustainability' },
  sustainability: { url: 'sustainability.html', titleKey: 'nav.csr', title: 'Sustainability' },
  investors: { url: 'investors.html', titleKey: 'nav.investors', title: 'Investor Relations' },
  projects: { url: 'projects.html', titleKey: 'nav.projects', title: 'Major Projects' },
  gallery: { url: 'gallery.html', titleKey: 'nav.gallery', title: 'Gallery' },
  news: { url: 'news.html', titleKey: 'nav.news', title: 'News & Events' },
  media_center: { url: 'media-center.html', titleKey: 'nav.news', title: 'Media Center' },
  contact: { url: 'contact.html', titleKey: 'footer.contact', title: 'Contact' },
};
// Skipped prefixes: nav/mob/footer/chat (page chrome), dashboard (demo
// portal, excluded from search per robots.txt), news_article (empty template).

const MIN_LEN = 30; // skip labels/buttons - too short to answer anything
const CHUNK_TARGET = 340; // characters per document (keeps answers focused)

function stripHtml(s) {
  return String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Curated verified facts (from scripts/_verified_lake_facts.md)       */
/* ------------------------------------------------------------------ */
// Each fact: { id, url, [lang]: { t: topic, s: answer, k: keywords } }.
// Answers are complete standalone sentences - the assistant serves them
// verbatim. Only officially-verified figures are used.
const CURATED_FACTS = [
  {
    id: 'countries',
    url: 'africa-network.html',
    en: {
      t: 'Where we operate',
      s: 'Lake Group operates across 8 countries in Africa - Tanzania (headquarters), Kenya, Zambia, DR Congo, Rwanda, Burundi, Ethiopia and Mozambique - plus a presence in the UAE (Dubai) through MERM and SAFF.',
      k: 'countries where operate operations locations presence africa which country region',
    },
    fr: {
      t: 'Où nous opérons',
      s: 'Lake Group opère dans 8 pays d\u2019Afrique - la Tanzanie (siège), le Kenya, la Zambie, la RD Congo, le Rwanda, le Burundi, l\u2019Éthiopie et le Mozambique - avec aussi une présence aux Émirats arabes unis (Dubaï) via MERM et SAFF.',
      k: 'pays où opérez opérations présence afrique quels quelles régions implantation',
    },
    sw: {
      t: 'Tunakofanya kazi',
      s: 'Lake Group inafanya kazi katika nchi 8 za Afrika - Tanzania (makao makuu), Kenya, Zambia, DR Congo, Rwanda, Burundi, Ethiopia na Msumbiji - pamoja na uwepo katika Falme za Kiarabu (Dubai) kupitia MERM na SAFF.',
      k: 'nchi gani wapi mnafanya kazi shughuli uwepo afrika mataifa mnaofanya',
    },
  },
  {
    id: 'founding',
    url: 'about.html',
    en: {
      t: 'Our founding',
      s: 'Lake Group was founded in 2006 in Dar es Salaam, Tanzania, by Ally Edha Awadh, with Lake Oil as its flagship company. It has grown into one of East and Central Africa\u2019s fastest growing energy trading and transportation conglomerates.',
      k: 'founded founding when started history year established who founder',
    },
    fr: {
      t: 'Notre fondation',
      s: 'Lake Group a été fondé en 2006 à Dar es Salaam, en Tanzanie, par Ally Edha Awadh, avec Lake Oil comme société phare. Le groupe est devenu l\u2019un des conglomérats d\u2019énergie et de transport à la croissance la plus rapide d\u2019Afrique de l\u2019Est et centrale.',
      k: 'fondé fondation quand créé histoire année établi fondateur',
    },
    sw: {
      t: 'Kuanzishwa kwetu',
      s: 'Lake Group ilianzishwa mwaka 2006 jijini Dar es Salaam, Tanzania, na Ally Edha Awadh, ikiwa na Lake Oil kama kampuni yake kuu. Imekua kuwa mojawapo ya makampuni ya biashara ya nishati na usafirishaji yanayokua kwa kasi zaidi Afrika Mashariki na Kati.',
      k: 'ilianzishwa lini historia mwaka mwanzilishi nani alianzisha',
    },
  },
  {
    id: 'leadership',
    url: 'leadership-ally-edha-awadh.html',
    en: {
      t: 'Leadership',
      s: 'Ally Edha Awadh is the founder, Executive Chairman and Owner of Lake Group. Full leadership profiles are on the Leadership page. He founded the group in 2006 at age 27 with a single fuel outlet in Dar es Salaam.',
      k: 'ceo chairman founder leadership who leads boss awadh ally management director executive chairman owner',
    },
    fr: {
      t: 'Direction',
      s: 'Ally Edha Awadh est le fondateur, président exécutif et propriétaire de Lake Group. Les profils de direction sont sur la page Leadership. Il a fondé le groupe en 2006, à 27 ans, avec une seule station-service à Dar es Salaam.',
      k: 'pdg président fondateur direction dirigeant qui dirige awadh directeur président exécutif',
    },
    sw: {
      t: 'Uongozi',
      s: 'Ally Edha Awadh ni mwanzilishi, Mwenyekiti Mtendaji na Mmiliki wa Lake Group. Wasifu kamili wa uongozi uko kwenye ukurasa wa Uongozi. Alianzisha kampuni hii mwaka 2006 akiwa na miaka 27, kwa kituo kimoja tu cha mafuta Dar es Salaam.',
      k: 'mkurugenzi mtendaji mwenyekiti mwanzilishi uongozi nani anaongoza awadh kiongozi mmiliki',
    },
  },
  {
    id: 'contact',
    url: 'contact.html',
    en: {
      t: 'Contact us',
      s: 'Our headquarters: Plot 49, Mikocheni Light Industrial Area, P.O. Box 5055, Dar es Salaam, Tanzania. Tel: (+255) 222 780 510 or (+255) 222 780 479. Email: admin@lakeoilgroup.com.',
      k: 'contact phone email address headquarters office reach call telephone location hq',
    },
    fr: {
      t: 'Nous contacter',
      s: 'Notre siège : Plot 49, Mikocheni Light Industrial Area, P.O. Box 5055, Dar es Salaam, Tanzanie. Tél : (+255) 222 780 510 ou (+255) 222 780 479. E-mail : admin@lakeoilgroup.com.',
      k: 'contact téléphone email adresse siège bureau appeler joindre coordonnées',
    },
    sw: {
      t: 'Wasiliana nasi',
      s: 'Makao makuu yetu: Plot 49, Mikocheni Light Industrial Area, S.L.P. 5055, Dar es Salaam, Tanzania. Simu: (+255) 222 780 510 au (+255) 222 780 479. Barua pepe: admin@lakeoilgroup.com.',
      k: 'wasiliana mawasiliano simu barua pepe anwani makao makuu ofisi piga',
    },
  },
  {
    id: 'workforce',
    url: 'about.html',
    en: {
      t: 'Our people',
      s: 'Lake Group employs more than 30,000 people of 21 nationalities across its operations.',
      k: 'employees staff workforce people how many jobs headcount team',
    },
    fr: {
      t: 'Nos équipes',
      s: 'Lake Group emploie plus de 30 000 personnes de 21 nationalités dans l\u2019ensemble de ses opérations.',
      k: 'employés effectif personnel combien salariés équipe',
    },
    sw: {
      t: 'Watu wetu',
      s: 'Lake Group inaajiri zaidi ya watu 30,000 wa mataifa 21 katika shughuli zake zote.',
      k: 'wafanyakazi waajiriwa wangapi idadi timu ajira watu',
    },
  },
  {
    id: 'fleet',
    url: 'fleet.html',
    en: {
      t: 'Our fleet',
      s: 'Lake Trans, the group\u2019s logistics arm founded in 2008, operates a fleet of more than 1,200 trucks - every truck GPS-tracked - hauling bulk liquids and cargo to Zambia, Rwanda, DR Congo, Burundi, Malawi, Kenya and Uganda, with workshops in Kibaha, Kigamboni, Morogoro, Nairobi and Ndola.',
      k: 'fleet trucks how many vehicles tankers transport haulage lake trans lorries',
    },
    fr: {
      t: 'Notre flotte',
      s: 'Lake Trans, la branche logistique du groupe fondée en 2008, exploite une flotte de plus de 1 200 camions - tous suivis par GPS - transportant liquides en vrac et marchandises vers la Zambie, le Rwanda, la RD Congo, le Burundi, le Malawi, le Kenya et l\u2019Ouganda, avec des ateliers à Kibaha, Kigamboni, Morogoro, Nairobi et Ndola.',
      k: 'flotte camions combien véhicules citernes transport lake trans',
    },
    sw: {
      t: 'Meli yetu ya magari',
      s: 'Lake Trans, tawi la usafirishaji la kampuni lililoanzishwa mwaka 2008, linaendesha zaidi ya malori 1,200 - kila lori likifuatiliwa kwa GPS - yakisafirisha mafuta na mizigo kwenda Zambia, Rwanda, DR Congo, Burundi, Malawi, Kenya na Uganda, yakiwa na karakana Kibaha, Kigamboni, Morogoro, Nairobi na Ndola.',
      k: 'malori magari mangapi usafirishaji lake trans karakana matenki',
    },
  },
  {
    id: 'stations',
    url: 'station-locator.html',
    en: {
      t: 'Fuel stations',
      s: 'Lake Group operates 152 fuel stations across Tanzania and the wider region. Use the Station Locator to find the nearest one.',
      k: 'stations petrol gas station how many where locator filling nearest retail',
    },
    fr: {
      t: 'Stations-service',
      s: 'Lake Group exploite 152 stations-service en Tanzanie et dans la région. Utilisez le localisateur de stations pour trouver la plus proche.',
      k: 'stations essence combien où localisateur station-service réseau',
    },
    sw: {
      t: 'Vituo vya mafuta',
      s: 'Lake Group inaendesha vituo 152 vya mafuta Tanzania na kanda nzima. Tumia ukurasa wa Kitafuta Vituo kupata kituo kilicho karibu nawe.',
      k: 'vituo mafuta vingapi wapi kituo karibu petroli',
    },
  },
  {
    id: 'lakeoil',
    url: 'lake-oil.html',
    en: {
      t: 'Lake Oil - fuel & petroleum',
      s: 'Lake Oil, the group\u2019s flagship company, is one of the top 5 petroleum distributors in Tanzania. Its Kigamboni depot in Dar es Salaam holds 38 million litres of storage with direct pipeline access to the oil import jetty, supported by 85 owned retail stations and a fleet of 300 tankers.',
      k: 'lake oil fuel petroleum diesel petrol depot storage kigamboni distributor bunkering',
    },
    fr: {
      t: 'Lake Oil - carburants & pétrole',
      s: 'Lake Oil, la société phare du groupe, est l\u2019un des 5 premiers distributeurs de produits pétroliers en Tanzanie. Son dépôt de Kigamboni à Dar es Salaam offre 38 millions de litres de stockage avec un accès direct par pipeline à la jetée d\u2019importation, appuyé par 152 stations en propre et une flotte de 300 camions-citernes.',
      k: 'lake oil carburant pétrole diesel essence dépôt stockage distributeur',
    },
    sw: {
      t: 'Lake Oil - mafuta na petroli',
      s: 'Lake Oil, kampuni kuu ya kundi hili, ni miongoni mwa wasambazaji 5 bora wa bidhaa za petroli Tanzania. Ghala lake la Kigamboni, Dar es Salaam, lina uwezo wa kuhifadhi lita milioni 38 na bomba la moja kwa moja kutoka gati la kupokelea mafuta, likisaidiwa na vituo 152 vya rejareja na matenki 300 ya usafirishaji.',
      k: 'lake oil mafuta petroli dizeli ghala hifadhi kigamboni msambazaji',
    },
  },
  {
    id: 'lakegas',
    url: 'lake-gas.html',
    en: {
      t: 'Lake Gas - LPG',
      s: 'Lake Gas supplies retail and bulk LPG in Tanzania, Zambia, DR Congo, Kenya, Burundi and Rwanda, with 6 kg, 10 kg composite, 15 kg and 38 kg cylinders. It was the first to introduce composite LPG cylinders in Africa, and its Tanga terminal was built as East Africa\u2019s largest LPG storage facility.',
      k: 'lpg gas cylinders lake gas cooking composite tanga bulk propane bottle',
    },
    fr: {
      t: 'Lake Gas - GPL',
      s: 'Lake Gas fournit du GPL au détail et en vrac en Tanzanie, Zambie, RD Congo, au Kenya, au Burundi et au Rwanda, avec des bouteilles de 6 kg, 10 kg composite, 15 kg et 38 kg. Premier à introduire les bouteilles GPL composites en Afrique, son terminal de Tanga a été construit comme la plus grande installation de stockage de GPL d\u2019Afrique de l\u2019Est.',
      k: 'gpl gaz bouteilles lake gas cuisine composite tanga vrac',
    },
    sw: {
      t: 'Lake Gas - gesi ya LPG',
      s: 'Lake Gas inasambaza gesi ya LPG kwa rejareja na kwa wingi Tanzania, Zambia, DR Congo, Kenya, Burundi na Rwanda, kwa mitungi ya kilo 6, kilo 10 (composite), kilo 15 na kilo 38. Ilikuwa ya kwanza kuleta mitungi ya composite Afrika, na kituo chake cha Tanga kilijengwa kuwa ghala kubwa zaidi la kuhifadhi LPG Afrika Mashariki.',
      k: 'gesi lpg mitungi lake gas kupikia tanga mtungi',
    },
  },
  {
    id: 'lakesteel',
    url: 'lake-steel.html',
    en: {
      t: 'Lake Steel',
      s: 'Lake Steel is the first company in Tanzania to introduce high-strength corrosion-resistant (HS-CR) reinforcement steel bars. Its fully computerized rolling mill in Kibaha produces up to 25 tonnes per hour - around 100,000 MT per year.',
      k: 'steel rebar hs-cr bars lake steel mill rolling reinforcement iron',
    },
    fr: {
      t: 'Lake Steel',
      s: 'Lake Steel est la première entreprise de Tanzanie à introduire des barres d\u2019armature haute résistance et anticorrosion (HS-CR). Son laminoir entièrement informatisé à Kibaha produit jusqu\u2019à 25 tonnes par heure - environ 100 000 tonnes par an.',
      k: 'acier armature hs-cr barres lake steel laminoir fer',
    },
    sw: {
      t: 'Lake Steel',
      s: 'Lake Steel ni kampuni ya kwanza Tanzania kuleta nondo imara zisizoshika kutu (HS-CR). Kiwanda chake cha kisasa kilichopo Kibaha kinazalisha hadi tani 25 kwa saa - takriban tani 100,000 kwa mwaka.',
      k: 'chuma nondo hs-cr lake steel kiwanda vyuma',
    },
  },
  {
    id: 'concrete',
    url: 'lake-premix-cement.html',
    en: {
      t: 'GCCP - concrete & aggregates',
      s: 'GCCP (Gulf Concrete & Cement Products), established in 2010, is Dar es Salaam\u2019s leading ready-mix concrete supplier, with fully-automatic batching plants, its own quarry at Lugoba, boom pumps and 20 truck mixers of 12 m\u00b3 each. Gulf Aggregates runs the crushing plants.',
      k: 'concrete gccp ready-mix cement aggregate quarry batching premix gulf',
    },
    fr: {
      t: 'GCCP - béton & granulats',
      s: 'GCCP (Gulf Concrete & Cement Products), créée en 2010, est le premier fournisseur de béton prêt à l\u2019emploi de Dar es Salaam, avec des centrales à béton entièrement automatiques, sa propre carrière à Lugoba, des pompes à flèche et 20 camions-malaxeurs de 12 m\u00b3. Gulf Aggregates exploite les installations de concassage.',
      k: 'béton gccp prêt-à-l\u2019emploi ciment granulats carrière gulf',
    },
    sw: {
      t: 'GCCP - zege na kokoto',
      s: 'GCCP (Gulf Concrete & Cement Products), iliyoanzishwa mwaka 2010, ndiyo msambazaji mkuu wa zege tayari (ready-mix) Dar es Salaam, ikiwa na mitambo ya kisasa ya kuchanganyia, machimbo yake ya Lugoba, pampu za kunyanyulia na malori 20 ya kuchanganyia zege ya mita za ujazo 12 kila moja. Gulf Aggregates inaendesha mitambo ya kusaga kokoto.',
      k: 'zege gccp saruji kokoto machimbo gulf simiti',
    },
  },
  {
    id: 'lubricants',
    url: 'lake-lubes.html',
    en: {
      t: 'Lake Lubes - lubricants',
      s: 'Lake Lubes, incorporated in Dar es Salaam in 2014, manufactures and distributes lubricants and greases - including LAKE 4T, LAKE HD SUPREME, LAKE POWER, gear oils, ATF, coolants and greases - sold through the Lake Oil station network and across the group\u2019s countries, with 24/7 technical after-sales support.',
      k: 'lubricants oil grease lake lubes engine motor coolant gear',
    },
    fr: {
      t: 'Lake Lubes - lubrifiants',
      s: 'Lake Lubes, immatriculée à Dar es Salaam en 2014, fabrique et distribue lubrifiants et graisses - dont LAKE 4T, LAKE HD SUPREME, LAKE POWER, huiles pour engrenages, ATF, liquides de refroidissement et graisses - vendus via le réseau de stations Lake Oil et dans les pays du groupe, avec une assistance technique 24 h/24.',
      k: 'lubrifiants huile graisse lake lubes moteur refroidissement',
    },
    sw: {
      t: 'Lake Lubes - mafuta ya kulainisha',
      s: 'Lake Lubes, iliyoandikishwa Dar es Salaam mwaka 2014, inatengeneza na kusambaza mafuta ya kulainisha na grisi - ikiwemo LAKE 4T, LAKE HD SUPREME, LAKE POWER, mafuta ya gia, ATF, vipoza-injini na grisi - yanayouzwa kupitia mtandao wa vituo vya Lake Oil na nchi zote za kundi, pamoja na huduma ya kiufundi saa 24.',
      k: 'mafuta ya kulainisha grisi lake lubes injini oili',
    },
  },
  {
    id: 'containers',
    url: 'aficd.html',
    en: {
      t: 'Container services',
      s: 'AFICD (African Inland Container Depot) provides ICD, CFS and empty-container services at Tazara, Pugu Road, Dar es Salaam - a 14,000 m\u00b2 yard with 4,000 TEU capacity and a rail siding to the port - serving Rwanda, Burundi, Uganda, DR Congo, Zambia and Malawi. ACFS adds a 5,000 TEU cargo freight station.',
      k: 'container icd cfs aficd acfs depot teu shipping freight port',
    },
    fr: {
      t: 'Services de conteneurs',
      s: 'AFICD (African Inland Container Depot) fournit des services ICD, CFS et de dépôt de conteneurs vides à Tazara, Pugu Road, Dar es Salaam - un parc de 14 000 m\u00b2 d\u2019une capacité de 4 000 EVP relié au port par voie ferrée - au service du Rwanda, du Burundi, de l\u2019Ouganda, de la RD Congo, de la Zambie et du Malawi. ACFS ajoute une gare de fret de 5 000 EVP.',
      k: 'conteneurs icd cfs aficd acfs dépôt evp fret port',
    },
    sw: {
      t: 'Huduma za makontena',
      s: 'AFICD (African Inland Container Depot) inatoa huduma za ICD, CFS na makontena matupu pale Tazara, Barabara ya Pugu, Dar es Salaam - yadi ya mita za mraba 14,000 yenye uwezo wa TEU 4,000 na reli inayounganisha bandarini - ikihudumia Rwanda, Burundi, Uganda, DR Congo, Zambia na Malawi. ACFS inaongeza kituo cha mizigo cha TEU 5,000.',
      k: 'makontena kontena icd cfs aficd acfs bandari mizigo',
    },
  },
  {
    id: 'subsidiaries',
    url: 'services.html',
    en: {
      t: 'Group companies',
      s: 'Lake Group\u2019s main companies are Lake Oil (fuel & petroleum), Lake Gas (LPG), Lake Trans (logistics), Lake Lubes (lubricants), Lake Steel (HS-CR rebar), GCCP and Gulf Aggregates (concrete & aggregates), AFICD and ACFS (container services), plus MERM (ready-mix) and SAFF (freight forwarding) in Dubai.',
      k: 'subsidiaries companies divisions group businesses sectors what do you do services brands',
    },
    fr: {
      t: 'Sociétés du groupe',
      s: 'Les principales sociétés de Lake Group sont Lake Oil (carburants & pétrole), Lake Gas (GPL), Lake Trans (logistique), Lake Lubes (lubrifiants), Lake Steel (armatures HS-CR), GCCP et Gulf Aggregates (béton & granulats), AFICD et ACFS (services de conteneurs), plus MERM (béton prêt à l\u2019emploi) et SAFF (transit) à Dubaï.',
      k: 'filiales sociétés divisions groupe activités secteurs que faites-vous services',
    },
    sw: {
      t: 'Kampuni za kundi',
      s: 'Kampuni kuu za Lake Group ni Lake Oil (mafuta na petroli), Lake Gas (gesi ya LPG), Lake Trans (usafirishaji), Lake Lubes (mafuta ya kulainisha), Lake Steel (nondo za HS-CR), GCCP na Gulf Aggregates (zege na kokoto), AFICD na ACFS (huduma za makontena), pamoja na MERM (zege tayari) na SAFF (uwakala wa mizigo) huko Dubai.',
      k: 'kampuni tanzu matawi kundi biashara sekta mnafanya nini huduma',
    },
  },
  {
    id: 'careers',
    url: 'careers.html',
    en: {
      t: 'Careers',
      s: 'We are always looking for talented people across our group companies in 8 countries. Visit the Careers page to explore current opportunities and apply.',
      k: 'careers jobs vacancies hiring work employment apply recruitment opportunity',
    },
    fr: {
      t: 'Carrières',
      s: 'Nous recherchons en permanence des talents pour les sociétés de notre groupe dans 8 pays. Consultez la page Carrières pour découvrir les opportunités actuelles et postuler.',
      k: 'carrières emplois postes recrutement travailler candidature postuler',
    },
    sw: {
      t: 'Ajira',
      s: 'Daima tunatafuta watu wenye vipaji katika kampuni za kundi letu katika nchi 8. Tembelea ukurasa wa Ajira kuona nafasi zilizopo na kutuma maombi.',
      k: 'ajira kazi nafasi kuajiriwa fursa maombi',
    },
  },
  {
    id: 'values',
    url: 'about.html',
    en: {
      t: 'Values & culture',
      s: 'Lake Group\u2019s core values are Teamwork, Reliability, Integrity and Customer Satisfaction, backed by a culture of Quality, Service, Safety and Professionalism.',
      k: 'values culture mission vision principles quality safety',
    },
    fr: {
      t: 'Valeurs & culture',
      s: 'Les valeurs fondamentales de Lake Group sont le travail d\u2019équipe, la fiabilité, l\u2019intégrité et la satisfaction client, portées par une culture de qualité, de service, de sécurité et de professionnalisme.',
      k: 'valeurs culture mission vision principes qualité sécurité',
    },
    sw: {
      t: 'Maadili na utamaduni',
      s: 'Maadili ya msingi ya Lake Group ni Ushirikiano, Kuaminika, Uadilifu na Kuridhika kwa Wateja, yakichagizwa na utamaduni wa Ubora, Huduma, Usalama na Weledi.',
      k: 'maadili utamaduni dhamira maono kanuni ubora usalama',
    },
  },
];

/* ------------------------------------------------------------------ */
/* Build per-language documents                                        */
/* ------------------------------------------------------------------ */
function buildLang(lang) {
  const dict = CONTENT[lang];
  const docs = [];

  // 1. Curated facts first (f:1 gives them a ranking boost at query time).
  // Fall back to English when a locale pack (e.g. hi/ar) has not yet been
  // hand-authored for a fact - page chunks below still use the translated dict.
  for (const fact of CURATED_FACTS) {
    const loc = fact[lang] || fact.en;
    if (!loc) continue;
    docs.push({
      id: 'fact:' + fact.id,
      t: loc.t,
      s: loc.s,
      u: fact.url,
      k: loc.k,
      f: 1,
    });
  }

  // 2. Page content chunks from the i18n dictionary.
  const keys = Object.keys(CONTENT.en); // en ordering = stable ids across langs
  const byPage = {};
  for (const key of keys) {
    const prefix = key.split('.')[0];
    if (!PAGES[prefix]) continue;
    const raw = dict[key] !== undefined ? dict[key] : CONTENT.en[key];
    const text = stripHtml(raw);
    if (text.length < MIN_LEN) continue;
    // Alt-text keys describe images, not answerable content.
    if (/\.alt(\.|$)|\balt\d*$/.test(key)) continue;
    const list = (byPage[prefix] = byPage[prefix] || []);
    // Pages often repeat the same string (title + hero heading, card +
    // detail); duplicates just bloat the chunk and read badly verbatim.
    if (list.indexOf(text) !== -1) continue;
    list.push(text);
  }

  for (const prefix of Object.keys(byPage)) {
    const page = PAGES[prefix];
    const title =
      (dict[page.titleKey] && stripHtml(dict[page.titleKey])) ||
      (CONTENT.en[page.titleKey] && stripHtml(CONTENT.en[page.titleKey])) ||
      page.title;
    let buf = [];
    let bufLen = 0;
    let n = 0;
    const flush = () => {
      if (!buf.length) return;
      docs.push({
        id: 'pg:' + prefix + ':' + n++,
        t: title,
        s: buf.join(' '),
        u: page.url,
      });
      buf = [];
      bufLen = 0;
    };
    for (const text of byPage[prefix]) {
      buf.push(text);
      bufLen += text.length;
      if (bufLen >= CHUNK_TARGET) flush();
    }
    flush();
  }

  return { docs };
}

const kb = { version: 1, langs: {} };
for (const lang of LANGS) kb.langs[lang] = buildLang(lang);

const payload =
  '/* Generated by scripts/build_assistant_kb.js - DO NOT EDIT BY HAND.\n' +
  ' * Offline knowledge base for assets/assistant.js (curated verified facts\n' +
  ' * + page content chunks from assets/i18n-content.json, en/fr/sw/hi/ar). */\n' +
  'window.__LAKE_ASSISTANT_KB__ = ' +
  JSON.stringify(kb) +
  ';\n';

fs.writeFileSync(OUT, payload, 'utf8');

for (const lang of LANGS) {
  const d = kb.langs[lang].docs;
  console.log(
    `${lang}: ${d.length} docs (${d.filter((x) => x.f).length} curated facts)`
  );
}
console.log(
  `wrote assets/assistant-kb.js (${(payload.length / 1024).toFixed(1)} KB)`
);
