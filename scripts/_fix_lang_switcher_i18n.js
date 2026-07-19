#!/usr/bin/env node
/**
 * Adds missing UI chrome i18n keys, wires contact/services/company CTAs,
 * regenerates i18n-content.js, and prepares for normalize_nav.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const NEW_KEYS = {
  en: {
    'lang.label': 'Language',
    'nav.menu': 'Menu',
    'footer.linkedin': 'LinkedIn',
    'footer.facebook': 'Facebook',
    'footer.twitter': 'X / Twitter',
    'footer.youtube': 'YouTube',
    'common.learnMore': 'Learn more',
    'common.exploreMap': 'Explore the map',
    'cta.findStation': 'Find a Station',
    'cta.contact': 'Contact',
    'company.cta.lede': 'Division phone, email and address details for this company and every Lake Group subsidiary are listed on the Contact Us page.',
    'logoloop.aria': 'Lake Group subsidiary companies',
    'contact.dir.eyebrow': 'Subsidiaries',
    'contact.dir.title': 'Contact Each Company',
    'contact.dir.lede': 'Addresses and phones below come from Lake Group’s official site and subsidiary data where available. Where a division does not publish a separate line, Group HQ contacts from lakeoilgroup.com are reused and labelled.',
    'contact.companyPage': 'Company page',
    'contact.src.hqUnpublished': 'Source: Group HQ (lakeoilgroup.com) - division line not published',
    'contact.src.hqPhones': 'Source: lakeoilgroup.com · HQ phones',
    'contact.src.appHq': 'Source: lakeoilgroup.com app data · HQ phones',
    'contact.src.depotHq': 'Source: lakeoilgroup.com depot list · HQ phones',
    'contact.src.plantHq': 'Source: lakeoilgroup.com plant address · HQ phones',
    'contact.src.opsHq': 'Source: lakeoilgroup.com operations · HQ phones',
    'contact.src.gccpHq': 'Source: lakeoilgroup.com GCCP · HQ phones',
    'contact.src.aficdHq': 'Source: lakeoilgroup.com AFICD locations · HQ phones',
    'contact.src.workshopHq': 'Source: lakeoilgroup.com workshop list · HQ phones',
    'contact.src.demoDubai': 'Demo shared Dubai line - division-specific number not published',
    'contact.div.flagship': 'Lake Energies · Flagship',
    'contact.div.energies': 'Lake Energies',
    'contact.div.lpg': 'Lake Energies · LPG',
    'contact.div.lubes': 'Lake Energies · Lubricants',
    'contact.div.mfg': 'Manufacturing',
    'contact.div.quarries': 'Manufacturing · Quarries',
    'contact.div.readymix': 'Manufacturing · Ready-mix',
    'contact.div.icd': 'Logistics · Inland Container Depot',
    'contact.div.logistics': 'Logistics',
    'contact.div.fleet': 'Logistics · Fleet',
    'contact.div.realEstate': 'Real Estate',
    'contact.div.mfgExternal': 'Manufacturing · External site',
    'contact.div.agroExternal': 'Agro Processing · External site',
    'contact.note.viaHq': 'Via Group HQ - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam',
    'contact.note.lubesDist': 'Dar es Salaam (incorporated) · Distributed via Lake Oil station network',
    'contact.note.atl': 'Tanzania aluminium trailer manufacturing',
    'contact.note.agro': 'Agro-processing division',
    'contact.note.kenya': 'Lake Oil Ltd (Kenya) · National station network',
    'services.breadcrumb': 'Subsidiaries',
    'services.hero.lede': '17 independent companies across five divisions - Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing.',
    'services.intro': 'Every Lake Group company now has its own dedicated page. Browse by division below, or use the "Subsidiaries" menu at the top of any page.',
    'services.desc.lakeOil': 'Top 5 petroleum distributor in Tanzania. Retail stations, bulk supply and storage across 8 countries.',
    'services.desc.lakeAviation': "Lake Group's aviation services division.",
    'services.desc.lakeGas': 'LPG bottling and distribution with cylinders for domestic and commercial use across 6 countries.',
    'services.desc.lakeLubes': 'Manufactures and distributes automotive, industrial and specialty lubricants in 5 countries.',
    'services.desc.lakeBuildings': "Lake Group's building materials and construction solutions arm.",
    'services.desc.lakePlastics': "Lake Group's plastics manufacturing division.",
    'services.desc.lakeSteel': 'Steel manufacturing and supply for construction and industry across the region.',
    'services.desc.lakeCylinders': "Lake Group's gas cylinder manufacturing division.",
    'services.desc.gulfAggregates': 'Quarrying and aggregates supply for construction projects across Tanzania.',
    'services.desc.atl': "Lake Group's aluminium trailer manufacturing arm.",
    'services.desc.lakePremix': 'Ready-mix concrete and cement solutions for major projects in Dar es Salaam and beyond.',
    'services.desc.aficd': 'Inland container depot and bonded warehousing linked to the port and rail corridor.',
    'services.desc.aill': "African Inland Logistic Limited - part of Lake Group's logistics network.",
    'services.desc.lakeTrans': 'Bulk haulage fleet moving fuel, LPG and cargo across East and Central Africa.',
    'services.desc.crossCountry': "Lake Group's real estate and property development arm.",
    'services.desc.oceanGalleria': "Lake Group's real estate and retail gallery development.",
    'services.desc.lakeAgro': "Lake Group's agro-processing division.",
    'services.network.title': 'Africa Network',
    'services.network.cta': 'Explore the map',
  },
  sw: {
    'lang.label': 'Lugha',
    'nav.menu': 'Menyu',
    'footer.linkedin': 'LinkedIn',
    'footer.facebook': 'Facebook',
    'footer.twitter': 'X / Twitter',
    'footer.youtube': 'YouTube',
    'common.learnMore': 'Jifunze zaidi',
    'common.exploreMap': 'Chunguza ramani',
    'cta.findStation': 'Tafuta Kituo',
    'cta.contact': 'Mawasiliano',
    'company.cta.lede': 'Nambari za simu, barua pepe na anwani za kampuni hii na kampuni zote tawi za Lake Group zipo kwenye ukurasa wa Wasiliana Nasi.',
    'logoloop.aria': 'Kampuni tawi za Lake Group',
    'contact.dir.eyebrow': 'Kampuni Tawi',
    'contact.dir.title': 'Wasiliana na Kila Kampuni',
    'contact.dir.lede': 'Anwani na simu hapa chini zinatokana na tovuti rasmi ya Lake Group na data ya kampuni tawi pale zinapopatikana. Pale kitengo hakichapishi nambari tofauti, mawasiliano ya Makao Makuu ya Kundi kutoka lakeoilgroup.com yanatumika na kuandikwa alama.',
    'contact.companyPage': 'Ukurasa wa kampuni',
    'contact.src.hqUnpublished': 'Chanzo: Makao Makuu ya Kundi (lakeoilgroup.com) - nambari ya kitengo haijachapishwa',
    'contact.src.hqPhones': 'Chanzo: lakeoilgroup.com · Simu za HQ',
    'contact.src.appHq': 'Chanzo: data ya app ya lakeoilgroup.com · Simu za HQ',
    'contact.src.depotHq': 'Chanzo: orodha ya depo lakeoilgroup.com · Simu za HQ',
    'contact.src.plantHq': 'Chanzo: anwani ya kiwanda lakeoilgroup.com · Simu za HQ',
    'contact.src.opsHq': 'Chanzo: shughuli za lakeoilgroup.com · Simu za HQ',
    'contact.src.gccpHq': 'Chanzo: GCCP lakeoilgroup.com · Simu za HQ',
    'contact.src.aficdHq': 'Chanzo: maeneo ya AFICD lakeoilgroup.com · Simu za HQ',
    'contact.src.workshopHq': 'Chanzo: orodha ya warsha lakeoilgroup.com · Simu za HQ',
    'contact.src.demoDubai': 'Nambari ya demo ya Dubai - nambari maalum ya kitengo haijachapishwa',
    'contact.div.flagship': 'Lake Energies · Kiongozi',
    'contact.div.energies': 'Lake Energies',
    'contact.div.lpg': 'Lake Energies · LPG',
    'contact.div.lubes': 'Lake Energies · Mafuta ya kulainisha',
    'contact.div.mfg': 'Utengenezaji',
    'contact.div.quarries': 'Utengenezaji · Machimbo',
    'contact.div.readymix': 'Utengenezaji · Ready-mix',
    'contact.div.icd': 'Usafirishaji · Depo ya Kontena Ndani',
    'contact.div.logistics': 'Usafirishaji',
    'contact.div.fleet': 'Usafirishaji · Magari',
    'contact.div.realEstate': 'Mali Isiyohamishika',
    'contact.div.mfgExternal': 'Utengenezaji · Tovuti ya nje',
    'contact.div.agroExternal': 'Usindikaji wa Kilimo · Tovuti ya nje',
    'contact.note.viaHq': 'Kupitia Makao Makuu - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam',
    'contact.note.lubesDist': 'Dar es Salaam (imesajiliwa) · Inasambazwa kupitia mtandao wa vituo vya Lake Oil',
    'contact.note.atl': 'Utengenezaji wa trela za alumini Tanzania',
    'contact.note.agro': 'Kitengo cha usindikaji wa kilimo',
    'contact.note.kenya': 'Lake Oil Ltd (Kenya) · Mtandao wa kitaifa wa vituo',
    'services.breadcrumb': 'Kampuni Tawi',
    'services.hero.lede': 'Kampuni 17 huru katika vitengo vitano - Lake Energies, Utengenezaji, Usafirishaji, Mali Isiyohamishika na Usindikaji wa Kilimo.',
    'services.intro': 'Kila kampuni ya Lake Group sasa ina ukurasa wake. Vinjari kwa kitengo hapa chini, au tumia menyu ya "Kampuni Tawi" juu ya ukurasa wowote.',
    'services.desc.lakeOil': 'Msambazaji wa petroli kati ya 5 bora Tanzania. Vituo vya rejareja, usambazaji wa wingi na uhifadhi katika nchi 8.',
    'services.desc.lakeAviation': 'Kitengo cha huduma za anga cha Lake Group.',
    'services.desc.lakeGas': 'Ujazaji na usambazaji wa LPG kwa matumizi ya nyumbani na biashara katika nchi 6.',
    'services.desc.lakeLubes': 'Hutengeneza na kusambaza mafuta ya magari, viwanda na maalum katika nchi 5.',
    'services.desc.lakeBuildings': 'Kitengo cha vifaa vya ujenzi na suluhisho za ujenzi cha Lake Group.',
    'services.desc.lakePlastics': 'Kitengo cha utengenezaji wa plastiki cha Lake Group.',
    'services.desc.lakeSteel': 'Utengenezaji na usambazaji wa chuma kwa ujenzi na viwanda katika eneo.',
    'services.desc.lakeCylinders': 'Kitengo cha utengenezaji wa mitungi ya gesi cha Lake Group.',
    'services.desc.gulfAggregates': 'Uchimbaji na usambazaji wa aggregates kwa miradi ya ujenzi Tanzania.',
    'services.desc.atl': 'Kitengo cha utengenezaji wa trela za alumini cha Lake Group.',
    'services.desc.lakePremix': 'Suluhisho za zege ready-mix na saruji kwa miradi mikubwa Dar es Salaam na kwingineko.',
    'services.desc.aficd': 'Depo ya kontena ndani na maghala yaliyounganishwa na bandari na reli.',
    'services.desc.aill': 'African Inland Logistic Limited - sehemu ya mtandao wa usafirishaji wa Lake Group.',
    'services.desc.lakeTrans': 'Meli ya magari ya kubeba mafuta, LPG na mizigo Afrika Mashariki na Kati.',
    'services.desc.crossCountry': 'Kitengo cha mali isiyohamishika na maendeleo ya majengo cha Lake Group.',
    'services.desc.oceanGalleria': 'Maendeleo ya mali isiyohamishika na gallery ya rejareja ya Lake Group.',
    'services.desc.lakeAgro': 'Kitengo cha usindikaji wa kilimo cha Lake Group.',
    'services.network.title': 'Mtandao wa Afrika',
    'services.network.cta': 'Chunguza ramani',
  },
  fr: {
    'lang.label': 'Langue',
    'nav.menu': 'Menu',
    'footer.linkedin': 'LinkedIn',
    'footer.facebook': 'Facebook',
    'footer.twitter': 'X / Twitter',
    'footer.youtube': 'YouTube',
    'common.learnMore': 'En savoir plus',
    'common.exploreMap': 'Explorer la carte',
    'cta.findStation': 'Trouver une station',
    'cta.contact': 'Contact',
    'company.cta.lede': 'Les numéros, e-mails et adresses de cette société et de toutes les filiales Lake Group figurent sur la page Contactez-nous.',
    'logoloop.aria': 'Filiales du Lake Group',
    'contact.dir.eyebrow': 'Filiales',
    'contact.dir.title': 'Contacter chaque société',
    'contact.dir.lede': 'Les adresses et téléphones ci-dessous proviennent du site officiel de Lake Group et des données des filiales lorsqu’elles sont disponibles. Lorsqu’une division ne publie pas de ligne distincte, les contacts du siège du Groupe sur lakeoilgroup.com sont réutilisés et indiqués.',
    'contact.companyPage': 'Page de la société',
    'contact.src.hqUnpublished': 'Source : Siège du Groupe (lakeoilgroup.com) - ligne de division non publiée',
    'contact.src.hqPhones': 'Source : lakeoilgroup.com · Téléphones du siège',
    'contact.src.appHq': 'Source : données app lakeoilgroup.com · Téléphones du siège',
    'contact.src.depotHq': 'Source : liste des dépôts lakeoilgroup.com · Téléphones du siège',
    'contact.src.plantHq': 'Source : adresse usine lakeoilgroup.com · Téléphones du siège',
    'contact.src.opsHq': 'Source : opérations lakeoilgroup.com · Téléphones du siège',
    'contact.src.gccpHq': 'Source : GCCP lakeoilgroup.com · Téléphones du siège',
    'contact.src.aficdHq': 'Source : sites AFICD lakeoilgroup.com · Téléphones du siège',
    'contact.src.workshopHq': 'Source : liste des ateliers lakeoilgroup.com · Téléphones du siège',
    'contact.src.demoDubai': 'Ligne démo partagée Dubai - numéro propre à la division non publié',
    'contact.div.flagship': 'Lake Energies · Phare',
    'contact.div.energies': 'Lake Energies',
    'contact.div.lpg': 'Lake Energies · GPL',
    'contact.div.lubes': 'Lake Energies · Lubrifiants',
    'contact.div.mfg': 'Fabrication',
    'contact.div.quarries': 'Fabrication · Carrières',
    'contact.div.readymix': 'Fabrication · Béton prêt à l’emploi',
    'contact.div.icd': 'Logistique · Dépôt de conteneurs intérieur',
    'contact.div.logistics': 'Logistique',
    'contact.div.fleet': 'Logistique · Flotte',
    'contact.div.realEstate': 'Immobilier',
    'contact.div.mfgExternal': 'Fabrication · Site externe',
    'contact.div.agroExternal': 'Agroalimentaire · Site externe',
    'contact.note.viaHq': 'Via le siège du Groupe - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam',
    'contact.note.lubesDist': 'Dar es Salaam (immatriculée) · Distribué via le réseau de stations Lake Oil',
    'contact.note.atl': 'Fabrication de remorques en aluminium en Tanzanie',
    'contact.note.agro': 'Division agroalimentaire',
    'contact.note.kenya': 'Lake Oil Ltd (Kenya) · Réseau national de stations',
    'services.breadcrumb': 'Filiales',
    'services.hero.lede': '17 sociétés indépendantes dans cinq divisions - Lake Energies, Fabrication, Logistique, Immobilier et Agroalimentaire.',
    'services.intro': 'Chaque société Lake Group a désormais sa propre page. Parcourez par division ci-dessous, ou utilisez le menu « Filiales » en haut de chaque page.',
    'services.desc.lakeOil': 'Distributeur pétrolier parmi les 5 premiers en Tanzanie. Stations, vrac et stockage dans 8 pays.',
    'services.desc.lakeAviation': 'Division des services aéronautiques de Lake Group.',
    'services.desc.lakeGas': 'Embouteillage et distribution de GPL pour usages domestiques et commerciaux dans 6 pays.',
    'services.desc.lakeLubes': 'Fabrique et distribue des lubrifiants automobiles, industriels et spécialisés dans 5 pays.',
    'services.desc.lakeBuildings': 'Bras matériaux de construction et solutions de Lake Group.',
    'services.desc.lakePlastics': 'Division de fabrication de plastiques de Lake Group.',
    'services.desc.lakeSteel': 'Fabrication et fourniture d’acier pour la construction et l’industrie dans la région.',
    'services.desc.lakeCylinders': 'Division de fabrication de bouteilles de gaz de Lake Group.',
    'services.desc.gulfAggregates': 'Carrières et granulats pour projets de construction en Tanzanie.',
    'services.desc.atl': 'Bras de fabrication de remorques en aluminium de Lake Group.',
    'services.desc.lakePremix': 'Béton prêt à l’emploi et ciment pour grands projets à Dar es Salaam et au-delà.',
    'services.desc.aficd': 'Dépôt de conteneurs intérieur et entreposage sous douane liés au port et au rail.',
    'services.desc.aill': 'African Inland Logistic Limited - partie du réseau logistique de Lake Group.',
    'services.desc.lakeTrans': 'Flotte de transport en vrac de carburant, GPL et marchandises en Afrique de l’Est et centrale.',
    'services.desc.crossCountry': 'Bras immobilier et développement immobilier de Lake Group.',
    'services.desc.oceanGalleria': 'Développement immobilier et galerie commerciale de Lake Group.',
    'services.desc.lakeAgro': 'Division agroalimentaire de Lake Group.',
    'services.network.title': 'Réseau Afrique',
    'services.network.cta': 'Explorer la carte',
  },
  hi: {
    'lang.label': 'भाषा',
    'nav.menu': 'मेनू',
    'footer.linkedin': 'LinkedIn',
    'footer.facebook': 'Facebook',
    'footer.twitter': 'X / Twitter',
    'footer.youtube': 'YouTube',
    'common.learnMore': 'और जानें',
    'common.exploreMap': 'मानचित्र देखें',
    'cta.findStation': 'स्टेशन खोजें',
    'cta.contact': 'संपर्क',
    'company.cta.lede': 'इस कंपनी और Lake Group की सभी सहायक कंपनियों के फोन, ईमेल और पते Contact Us पेज पर सूचीबद्ध हैं।',
    'logoloop.aria': 'Lake Group की सहायक कंपनियाँ',
    'contact.dir.eyebrow': 'सहायक कंपनियाँ',
    'contact.dir.title': 'प्रत्येक कंपनी से संपर्क करें',
    'contact.dir.lede': 'नीचे दिए पते और फोन Lake Group की आधिकारिक साइट और उपलब्ध सहायक डेटा से हैं। जहाँ कोई डिवीजन अलग लाइन प्रकाशित नहीं करता, वहाँ lakeoilgroup.com के ग्रुप HQ संपर्क उपयोग किए जाते हैं और चिह्नित हैं।',
    'contact.companyPage': 'कंपनी पेज',
    'contact.src.hqUnpublished': 'स्रोत: ग्रुप HQ (lakeoilgroup.com) - डिवीजन लाइन प्रकाशित नहीं',
    'contact.src.hqPhones': 'स्रोत: lakeoilgroup.com · HQ फोन',
    'contact.src.appHq': 'स्रोत: lakeoilgroup.com ऐप डेटा · HQ फोन',
    'contact.src.depotHq': 'स्रोत: lakeoilgroup.com डिपो सूची · HQ फोन',
    'contact.src.plantHq': 'स्रोत: lakeoilgroup.com प्लांट पता · HQ फोन',
    'contact.src.opsHq': 'स्रोत: lakeoilgroup.com संचालन · HQ फोन',
    'contact.src.gccpHq': 'स्रोत: lakeoilgroup.com GCCP · HQ फोन',
    'contact.src.aficdHq': 'स्रोत: lakeoilgroup.com AFICD स्थान · HQ फोन',
    'contact.src.workshopHq': 'स्रोत: lakeoilgroup.com वर्कशॉप सूची · HQ फोन',
    'contact.src.demoDubai': 'डेमो साझा दुबई लाइन - डिवीजन-विशिष्ट नंबर प्रकाशित नहीं',
    'contact.div.flagship': 'Lake Energies · प्रमुख',
    'contact.div.energies': 'Lake Energies',
    'contact.div.lpg': 'Lake Energies · LPG',
    'contact.div.lubes': 'Lake Energies · स्नेहक',
    'contact.div.mfg': 'विनिर्माण',
    'contact.div.quarries': 'विनिर्माण · खदानें',
    'contact.div.readymix': 'विनिर्माण · रेडी-मिक्स',
    'contact.div.icd': 'लॉजिस्टिक्स · अंतर्देशीय कंटेनर डिपो',
    'contact.div.logistics': 'लॉजिस्टिक्स',
    'contact.div.fleet': 'लॉजिस्टिक्स · बेड़ा',
    'contact.div.realEstate': 'रियल एस्टेट',
    'contact.div.mfgExternal': 'विनिर्माण · बाहरी साइट',
    'contact.div.agroExternal': 'कृषि प्रसंस्करण · बाहरी साइट',
    'contact.note.viaHq': 'ग्रुप HQ के माध्यम से - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam',
    'contact.note.lubesDist': 'दार एस सलाम (निगमित) · Lake Oil स्टेशन नेटवर्क के माध्यम से वितरित',
    'contact.note.atl': 'तंजानिया एल्युमिनियम ट्रेलर विनिर्माण',
    'contact.note.agro': 'कृषि-प्रसंस्करण डिवीजन',
    'contact.note.kenya': 'Lake Oil Ltd (केन्या) · राष्ट्रीय स्टेशन नेटवर्क',
    'services.breadcrumb': 'सहायक कंपनियाँ',
    'services.hero.lede': 'पाँच डिवीजनों में 17 स्वतंत्र कंपनियाँ - Lake Energies, विनिर्माण, लॉजिस्टिक्स, रियल एस्टेट और कृषि प्रसंस्करण।',
    'services.intro': 'हर Lake Group कंपनी का अब अपना पेज है। नीचे डिवीजन के अनुसार देखें, या किसी भी पेज के शीर्ष पर "सहायक कंपनियाँ" मेनू का उपयोग करें।',
    'services.desc.lakeOil': 'तंजानिया में शीर्ष 5 पेट्रोलियम वितरक। 8 देशों में रिटेल स्टेशन, थोक आपूर्ति और भंडारण।',
    'services.desc.lakeAviation': 'Lake Group का विमानन सेवा डिवीजन।',
    'services.desc.lakeGas': '6 देशों में घरेलू और वाणिज्यिक उपयोग के लिए LPG बॉटलिंग और वितरण।',
    'services.desc.lakeLubes': '5 देशों में ऑटोमोटिव, औद्योगिक और विशेष स्नेहक का निर्माण और वितरण।',
    'services.desc.lakeBuildings': 'Lake Group की निर्माण सामग्री और निर्माण समाधान शाखा।',
    'services.desc.lakePlastics': 'Lake Group का प्लास्टिक विनिर्माण डिवीजन।',
    'services.desc.lakeSteel': 'क्षेत्र में निर्माण और उद्योग के लिए स्टील निर्माण और आपूर्ति।',
    'services.desc.lakeCylinders': 'Lake Group का गैस सिलेंडर विनिर्माण डिवीजन।',
    'services.desc.gulfAggregates': 'तंजानिया में निर्माण परियोजनाओं के लिए खनन और एग्रीगेट्स आपूर्ति।',
    'services.desc.atl': 'Lake Group की एल्युमिनियम ट्रेलर विनिर्माण शाखा।',
    'services.desc.lakePremix': 'दार एस सलाम और उससे आगे की बड़ी परियोजनाओं के लिए रेडी-मिक्स कंक्रीट और सीमेंट।',
    'services.desc.aficd': 'बंदरगाह और रेल गलियारे से जुड़ा अंतर्देशीय कंटेनर डिपो और बॉन्डेड वेयरहाउसिंग।',
    'services.desc.aill': 'African Inland Logistic Limited - Lake Group के लॉजिस्टिक्स नेटवर्क का हिस्सा।',
    'services.desc.lakeTrans': 'पूर्वी और मध्य अफ्रीका में ईंधन, LPG और कार्गो ले जाने वाला थोक परिवहन बेड़ा।',
    'services.desc.crossCountry': 'Lake Group की रियल एस्टेट और संपत्ति विकास शाखा।',
    'services.desc.oceanGalleria': 'Lake Group का रियल एस्टेट और रिटेल गैलरी विकास।',
    'services.desc.lakeAgro': 'Lake Group का कृषि-प्रसंस्करण डिवीजन।',
    'services.network.title': 'अफ्रीका नेटवर्क',
    'services.network.cta': 'मानचित्र देखें',
  },
  ar: {
    'lang.label': 'اللغة',
    'nav.menu': 'القائمة',
    'footer.linkedin': 'LinkedIn',
    'footer.facebook': 'Facebook',
    'footer.twitter': 'X / Twitter',
    'footer.youtube': 'YouTube',
    'common.learnMore': 'اعرف المزيد',
    'common.exploreMap': 'استكشف الخريطة',
    'cta.findStation': 'ابحث عن محطة',
    'cta.contact': 'اتصل',
    'company.cta.lede': 'أرقام الهاتف والبريد والعناوين لهذه الشركة ولجميع الشركات التابعة لمجموعة ليك مدرجة في صفحة اتصل بنا.',
    'logoloop.aria': 'الشركات التابعة لمجموعة ليك',
    'contact.dir.eyebrow': 'الشركات التابعة',
    'contact.dir.title': 'تواصل مع كل شركة',
    'contact.dir.lede': 'العناوين والهواتف أدناه من الموقع الرسمي لمجموعة ليك وبيانات الشركات التابعة حيث تتوفر. وحيث لا تنشر أي وحدة خطاً منفصلاً، تُعاد استخدام جهات اتصال المقر من lakeoilgroup.com مع التسمية.',
    'contact.companyPage': 'صفحة الشركة',
    'contact.src.hqUnpublished': 'المصدر: مقر المجموعة (lakeoilgroup.com) - لم يُنشر خط الوحدة',
    'contact.src.hqPhones': 'المصدر: lakeoilgroup.com · هواتف المقر',
    'contact.src.appHq': 'المصدر: بيانات تطبيق lakeoilgroup.com · هواتف المقر',
    'contact.src.depotHq': 'المصدر: قائمة مستودعات lakeoilgroup.com · هواتف المقر',
    'contact.src.plantHq': 'المصدر: عنوان المصنع lakeoilgroup.com · هواتف المقر',
    'contact.src.opsHq': 'المصدر: عمليات lakeoilgroup.com · هواتف المقر',
    'contact.src.gccpHq': 'المصدر: GCCP على lakeoilgroup.com · هواتف المقر',
    'contact.src.aficdHq': 'المصدر: مواقع AFICD على lakeoilgroup.com · هواتف المقر',
    'contact.src.workshopHq': 'المصدر: قائمة الورش lakeoilgroup.com · هواتف المقر',
    'contact.src.demoDubai': 'خط تجريبي مشترك في دبي - لم يُنشر رقم خاص بالوحدة',
    'contact.div.flagship': 'Lake Energies · الشركة الرائدة',
    'contact.div.energies': 'Lake Energies',
    'contact.div.lpg': 'Lake Energies · غاز البترول المسال',
    'contact.div.lubes': 'Lake Energies · زيوت التشحيم',
    'contact.div.mfg': 'التصنيع',
    'contact.div.quarries': 'التصنيع · المحاجر',
    'contact.div.readymix': 'التصنيع · خرسانة جاهزة',
    'contact.div.icd': 'اللوجستيات · مستودع حاويات داخلي',
    'contact.div.logistics': 'اللوجستيات',
    'contact.div.fleet': 'اللوجستيات · الأسطول',
    'contact.div.realEstate': 'العقارات',
    'contact.div.mfgExternal': 'التصنيع · موقع خارجي',
    'contact.div.agroExternal': 'التصنيع الزراعي · موقع خارجي',
    'contact.note.viaHq': 'عبر مقر المجموعة - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam',
    'contact.note.lubesDist': 'دار السلام (مسجّلة) · تُوزَّع عبر شبكة محطات Lake Oil',
    'contact.note.atl': 'تصنيع مقطورات الألمنيوم في تنزانيا',
    'contact.note.agro': 'وحدة التصنيع الزراعي',
    'contact.note.kenya': 'Lake Oil Ltd (كينيا) · شبكة محطات وطنية',
    'services.breadcrumb': 'الشركات التابعة',
    'services.hero.lede': '17 شركة مستقلة عبر خمس وحدات - Lake Energies، التصنيع، اللوجستيات، العقارات والتصنيع الزراعي.',
    'services.intro': 'لكل شركة في مجموعة ليك الآن صفحتها الخاصة. تصفّح حسب الوحدة أدناه، أو استخدم قائمة «الشركات التابعة» أعلى أي صفحة.',
    'services.desc.lakeOil': 'من أكبر 5 موزعي منتجات نفطية في تنزانيا. محطات تجزئة وإمداد بالجملة وتخزين في 8 دول.',
    'services.desc.lakeAviation': 'وحدة خدمات الطيران في مجموعة ليك.',
    'services.desc.lakeGas': 'تعبئة وتوزيع غاز البترول المسال للاستخدام المنزلي والتجاري في 6 دول.',
    'services.desc.lakeLubes': 'تصنيع وتوزيع زيوت السيارات والصناعة والتخصص في 5 دول.',
    'services.desc.lakeBuildings': 'ذراع مواد البناء وحلول الإنشاء في مجموعة ليك.',
    'services.desc.lakePlastics': 'وحدة تصنيع البلاستيك في مجموعة ليك.',
    'services.desc.lakeSteel': 'تصنيع وتوريد الصلب للبناء والصناعة في المنطقة.',
    'services.desc.lakeCylinders': 'وحدة تصنيع أسطوانات الغاز في مجموعة ليك.',
    'services.desc.gulfAggregates': 'المحاجر وتوريد الركام لمشاريع البناء في تنزانيا.',
    'services.desc.atl': 'ذراع تصنيع مقطورات الألمنيوم في مجموعة ليك.',
    'services.desc.lakePremix': 'خرسانة جاهزة وأسمنت للمشاريع الكبرى في دار السلام وما بعدها.',
    'services.desc.aficd': 'مستودع حاويات داخلي وتخزين جمركي مرتبط بالميناء والسكك.',
    'services.desc.aill': 'African Inland Logistic Limited - جزء من شبكة لوجستيات مجموعة ليك.',
    'services.desc.lakeTrans': 'أسطول نقل بالجملة للوقود وغاز البترول المسال والبضائع عبر شرق ووسط أفريقيا.',
    'services.desc.crossCountry': 'ذراع العقارات وتطوير الممتلكات في مجموعة ليك.',
    'services.desc.oceanGalleria': 'تطوير عقاري ومعرض تجزئة لمجموعة ليك.',
    'services.desc.lakeAgro': 'وحدة التصنيع الزراعي في مجموعة ليك.',
    'services.network.title': 'شبكة أفريقيا',
    'services.network.cta': 'استكشف الخريطة',
  },
};

// Also ensure hi/ar have Subsidiaries/Contact keys if apply script missed them
const CHROME_SYNC = {
  hi: {
    'nav.companies': 'सहायक कंपनियाँ ▾',
    'mob.companies': 'सहायक कंपनियाँ',
    'nav.contact': 'संपर्क करें',
    'footer.services': 'सहायक कंपनियाँ',
    'footer.viewAllCompanies': 'सभी सहायक कंपनियाँ देखें',
    'footer.contact': 'संपर्क करें',
  },
  ar: {
    'nav.companies': 'الشركات التابعة ▾',
    'mob.companies': 'الشركات التابعة',
    'nav.contact': 'اتصل بنا',
    'footer.services': 'الشركات التابعة',
    'footer.viewAllCompanies': 'عرض كل الشركات التابعة',
    'footer.contact': 'اتصل بنا',
  },
};

function updateI18nJson() {
  const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  for (const lang of Object.keys(NEW_KEYS)) {
    Object.assign(data[lang], NEW_KEYS[lang]);
  }
  Object.assign(data.hi, CHROME_SYNC.hi);
  Object.assign(data.ar, CHROME_SYNC.ar);

  // Keep key parity: any en key missing elsewhere gets en fallback (should not happen)
  const enKeys = Object.keys(data.en);
  for (const lang of ['sw', 'fr', 'hi', 'ar']) {
    for (const k of enKeys) {
      if (!(k in data[lang]) || data[lang][k] === '' || data[lang][k] == null) {
        data[lang][k] = data.en[k];
      }
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    path.join(ROOT, 'assets', 'i18n-content.js'),
    'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n',
    'utf8'
  );
  console.log('i18n keys updated. en count:', Object.keys(data.en).length);
}

function patchContact() {
  const file = path.join(ROOT, 'contact.html');
  let raw = fs.readFileSync(file, 'utf8');

  const reps = [
    [
      /<div class="fs-eyebrow">Subsidiaries<\/div>\s*<h2 class="fs-display">Contact Each Company<\/h2>\s*<p class="fs-lede"[^>]*>[\s\S]*?<\/p>/,
      '<div class="fs-eyebrow" data-i18n="contact.dir.eyebrow">Subsidiaries</div>\n      <h2 class="fs-display" data-i18n="contact.dir.title">Contact Each Company</h2>\n      <p class="fs-lede" style="max-width:62ch" data-i18n="contact.dir.lede">Addresses and phones below come from Lake Group’s official site and subsidiary data where available. Where a division does not publish a separate line, Group HQ contacts from lakeoilgroup.com are reused and labelled.</p>',
    ],
    [/>Company page</g, ' data-i18n="contact.companyPage">Company page<'],
    [
      /Source: Group HQ \(lakeoilgroup\.com\) - division line not published/g,
      null,
    ],
  ];

  // Head block
  raw = raw.replace(reps[0][0], reps[0][1]);

  // Company page links - only if not already tagged
  raw = raw.replace(
    /(<a href="[^"]+\.html")(?![^>]*data-i18n)>Company page<\/a>/g,
    '$1 data-i18n="contact.companyPage">Company page</a>'
  );

  const srcMap = [
    ['Source: Group HQ (lakeoilgroup.com) - division line not published', 'contact.src.hqUnpublished'],
    ['Source: lakeoilgroup.com app data · HQ phones', 'contact.src.appHq'],
    ['Source: lakeoilgroup.com depot list · HQ phones', 'contact.src.depotHq'],
    ['Source: lakeoilgroup.com plant address · HQ phones', 'contact.src.plantHq'],
    ['Source: lakeoilgroup.com operations · HQ phones', 'contact.src.opsHq'],
    ['Source: lakeoilgroup.com GCCP · HQ phones', 'contact.src.gccpHq'],
    ['Source: lakeoilgroup.com AFICD locations · HQ phones', 'contact.src.aficdHq'],
    ['Source: lakeoilgroup.com workshop list · HQ phones', 'contact.src.workshopHq'],
    ['Demo shared Dubai line - division-specific number not published', 'contact.src.demoDubai'],
  ];
  for (const [text, key] of srcMap) {
    const re = new RegExp(
      '(<span class="ct-src[^"]*"[^>]*)(>)' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(</span>)',
      'g'
    );
    raw = raw.replace(re, `$1 data-i18n="${key}"$2${text}$3`);
    // also bare spans without class attr extras
    const re2 = new RegExp(
      '(>)' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(</span>)',
      'g'
    );
    // Only tag if preceding tag lacks data-i18n for this key already handled above
  }

  // Simpler: replace source text spans wholesale
  for (const [text, key] of srcMap) {
    if (raw.includes('data-i18n="' + key + '"')) continue;
    raw = raw.split(text).join(text); // noop safety
    raw = raw.replace(
      new RegExp('>(\\s*)' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s*)<', 'g'),
      ` data-i18n="${key}">$1${text}$2<`
    );
  }

  const divMap = [
    ['Lake Energies · Flagship', 'contact.div.flagship'],
    ['Lake Energies · LPG', 'contact.div.lpg'],
    ['Lake Energies · Lubricants', 'contact.div.lubes'],
    ['Manufacturing · Quarries', 'contact.div.quarries'],
    ['Manufacturing · Ready-mix', 'contact.div.readymix'],
    ['Manufacturing · External site', 'contact.div.mfgExternal'],
    ['Logistics · Inland Container Depot', 'contact.div.icd'],
    ['Logistics · Fleet', 'contact.div.fleet'],
    ['Agro Processing · External site', 'contact.div.agroExternal'],
    ['Lake Energies', 'contact.div.energies'],
    ['Manufacturing', 'contact.div.mfg'],
    ['Logistics', 'contact.div.logistics'],
    ['Real Estate', 'contact.div.realEstate'],
  ];
  for (const [text, key] of divMap) {
    const re = new RegExp(
      '(<div class="ct-dir-div")(>)' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(</div>)',
      'g'
    );
    raw = raw.replace(re, `$1 data-i18n="${key}"$2${text}$3`);
  }

  const noteMap = [
    ['Via Group HQ - Plot 49, Mikocheni Light Industrial Area, Dar es Salaam', 'contact.note.viaHq'],
    ['Dar es Salaam (incorporated) · Distributed via Lake Oil station network', 'contact.note.lubesDist'],
    ['Tanzania aluminium trailer manufacturing', 'contact.note.atl'],
    ['Agro-processing division', 'contact.note.agro'],
    ['Lake Oil Ltd (Kenya) · National station network', 'contact.note.kenya'],
  ];
  for (const [text, key] of noteMap) {
    const re = new RegExp(
      '(<span)(>)' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(</span>)',
      'g'
    );
    raw = raw.replace(re, `$1 data-i18n="${key}"$2${text}$3`);
  }

  fs.writeFileSync(file, raw, 'utf8');
  console.log('patched contact.html');
}

function patchServices() {
  const file = path.join(ROOT, 'services.html');
  let raw = fs.readFileSync(file, 'utf8');

  raw = raw.replace(
    /<span>Subsidiaries<\/span>/,
    '<span data-i18n="services.breadcrumb">Subsidiaries</span>'
  );
  raw = raw.replace(
    /<h1>Subsidiaries<\/h1>/,
    '<h1 data-i18n="mob.companies">Subsidiaries</h1>'
  );
  raw = raw.replace(
    /<p>17 independent companies across five divisions &mdash; Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing\.<\/p>/,
    '<p data-i18n="services.hero.lede">17 independent companies across five divisions - Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing.</p>'
  );
  raw = raw.replace(
    /<p class="fs-lede" style="margin:0 auto;max-width:58ch">Every Lake Group company now has its own dedicated page\. Browse by division below, or use the "Subsidiaries" menu at the top of any page\.<\/p>/,
    '<p class="fs-lede" style="margin:0 auto;max-width:58ch" data-i18n="services.intro">Every Lake Group company now has its own dedicated page. Browse by division below, or use the "Subsidiaries" menu at the top of any page.</p>'
  );

  // Division category headers
  const cats = [
    ['Manufacturing', 'nav.dd.manufacturing'],
    ['Logistics', 'nav.dd.logisticsCos'],
    ['Real Estate', 'nav.dd.realEstate'],
    ['Agro Processing', 'nav.dd.agro'],
    ['Lake Energies', 'nav.dd.energies'],
  ];
  for (const [text, key] of cats) {
    raw = raw.replace(
      new RegExp('<div class="div-cat">' + text + '</div>', 'g'),
      `<div class="div-cat" data-i18n="${key}">${text}</div>`
    );
  }

  raw = raw.replace(/<span class="svc-link">Learn more<\/span>/g, '<span class="svc-link" data-i18n="common.learnMore">Learn more</span>');

  const descs = [
    ['Top 5 petroleum distributor in Tanzania. Retail stations, bulk supply and storage across 8 countries.', 'services.desc.lakeOil'],
    ["Lake Group's aviation services division.", 'services.desc.lakeAviation'],
    ['LPG bottling and distribution with cylinders for domestic and commercial use across 6 countries.', 'services.desc.lakeGas'],
    ['Manufactures and distributes automotive, industrial and specialty lubricants in 5 countries.', 'services.desc.lakeLubes'],
    ["Lake Group's building materials and construction solutions arm.", 'services.desc.lakeBuildings'],
    ["Lake Group's plastics manufacturing division.", 'services.desc.lakePlastics'],
    ["Lake Group's gas cylinder manufacturing division.", 'services.desc.lakeCylinders'],
    ["Lake Group's aluminium trailer manufacturing arm.", 'services.desc.atl'],
    ["African Inland Logistic Limited &mdash; part of Lake Group's logistics network.", 'services.desc.aill'],
    ["African Inland Logistic Limited - part of Lake Group's logistics network.", 'services.desc.aill'],
    ["Lake Group's real estate and property development arm.", 'services.desc.crossCountry'],
    ["Lake Group's real estate and retail gallery development.", 'services.desc.oceanGalleria'],
    ["Lake Group's agro-processing division.", 'services.desc.lakeAgro'],
  ];
  for (const [text, key] of descs) {
    const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    raw = raw.replace(new RegExp('<p>' + esc + '</p>', 'g'), `<p data-i18n="${key}">${text.replace(/&mdash;/g, ' - ')}</p>`);
  }

  // Remaining common desc patterns if present
  const more = [
    [/Steel manufacturing and supply for construction and industry across the region\./, 'services.desc.lakeSteel'],
    [/Quarrying and aggregates supply for construction projects across Tanzania\./, 'services.desc.gulfAggregates'],
    [/Ready-mix concrete and cement solutions for major projects in Dar es Salaam and beyond\./, 'services.desc.lakePremix'],
    [/Inland container depot and bonded warehousing linked to the port and rail corridor\./, 'services.desc.aficd'],
    [/Bulk haulage fleet moving fuel, LPG and cargo across East and Central Africa\./, 'services.desc.lakeTrans'],
  ];
  for (const [re, key] of more) {
    raw = raw.replace(new RegExp('<p>(' + re.source + ')</p>', 'g'), `<p data-i18n="${key}">$1</p>`);
  }

  raw = raw.replace(
    />(Africa Network)</,
    ' data-i18n="services.network.title">$1<'
  );
  raw = raw.replace(
    />Explore the map</g,
    ' data-i18n="services.network.cta">Explore the map<'
  );

  fs.writeFileSync(file, raw, 'utf8');
  console.log('patched services.html');
}

function patchCompanyPages() {
  const pages = [
    'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
    'lake-buildings.html', 'lake-plastics.html', 'lake-steel.html', 'lake-cylinders.html',
    'gulf-aggregates.html', 'lake-premix-cement.html', 'aficd.html', 'aill.html',
    'lake-trans.html', 'cross-country.html', 'ocean-galleria.html',
  ];
  for (const page of pages) {
    const file = path.join(ROOT, page);
    if (!fs.existsSync(file)) continue;
    let raw = fs.readFileSync(file, 'utf8');
    let changed = false;

    const ctaRe = /(<span class="fs-eyebrow")(>Contact<\/span>)/;
    if (ctaRe.test(raw) && !raw.includes('data-i18n="cta.contact"')) {
      raw = raw.replace(ctaRe, '$1 data-i18n="cta.contact"$2');
      changed = true;
    }

    raw = raw.replace(
      /(<p class="fs-lede"[^>]*>)Division phone, email and address details for [^<]+(<\/p>)/,
      (m, a, b) => {
        changed = true;
        return a.replace(/>$/, ' data-i18n="company.cta.lede">') +
          'Division phone, email and address details for this company and every Lake Group subsidiary are listed on the Contact Us page.' +
          b;
      }
    );
    // Fix if attribute already on p
    if (raw.includes('Division phone, email and address details for') && !raw.includes('data-i18n="company.cta.lede"')) {
      raw = raw.replace(
        /(<p class="fs-lede" style="max-width:58ch;margin-bottom:var\(--sp-6\)")(>)/,
        '$1 data-i18n="company.cta.lede"$2'
      );
      changed = true;
    }

    raw = raw.replace(
      /(<a href="contact\.html#[^"]+" class="btn btn-primary btn-lg")(>Contact Us<\/a>)/g,
      (m, a, b) => {
        if (a.includes('data-i18n')) return m;
        changed = true;
        return a + ' data-i18n="nav.contact"' + b;
      }
    );

    raw = raw.replace(
      /(<a href="station-locator\.html" class="btn btn-outline-dark")(>Find a Station<\/a>)/g,
      (m, a, b) => {
        if (a.includes('data-i18n')) return m;
        changed = true;
        return a + ' data-i18n="cta.findStation"' + b;
      }
    );

    // Hero contact buttons
    raw = raw.replace(
      /(<a href="contact\.html#[^"]+"[^>]*class="btn btn-outline-dark"[^>]*)(>Contact Us<\/a>|>Get in Touch<\/a>)/g,
      (m, a, b) => {
        if (a.includes('data-i18n')) return m;
        changed = true;
        const key = b.includes('Get in Touch') ? 'contact.2' : 'nav.contact';
        return a + ` data-i18n="${key}"` + b;
      }
    );

    if (changed) {
      fs.writeFileSync(file, raw, 'utf8');
      console.log('patched', page);
    }
  }
}

function patchLogoLoop() {
  const file = path.join(ROOT, 'assets', 'components', 'logo-loop-mount.js');
  let raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes('logoloop.aria')) {
    raw = raw.replace(
      "ariaLabel: 'Lake Group subsidiary companies',",
      "ariaLabel: (window.LakeI18n && LakeI18n.t('logoloop.aria')) || 'Lake Group subsidiary companies',"
    );
    // Live update on language change
    if (!raw.includes('lake-i18n-applied')) {
      raw = raw.replace(
        /(\}\)\(\);?\s*)$/,
        `
  document.addEventListener('lake-i18n-applied', function () {
    var label = (window.LakeI18n && LakeI18n.t('logoloop.aria')) || 'Lake Group subsidiary companies';
    document.querySelectorAll('.logoloop[aria-label]').forEach(function (el) {
      el.setAttribute('aria-label', label);
    });
  });
$1`
      );
    }
    fs.writeFileSync(file, raw, 'utf8');
    console.log('patched logo-loop-mount.js');
  }
}

function main() {
  updateI18nJson();
  patchContact();
  patchServices();
  patchCompanyPages();
  patchLogoLoop();
  console.log('done - run normalize_nav.js next');
}

main();
