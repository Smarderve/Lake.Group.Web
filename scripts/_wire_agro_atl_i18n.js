#!/usr/bin/env node
/**
 * Wire lake-agro.html + atl.html body copy to data-i18n and seed en/fr/sw/hi/ar.
 * Regenerates assets/i18n-content.js from the updated JSON.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');
const CACHE = '50';

function serializeCompact(dict) {
  const langs = Object.keys(dict).map((lang) => {
    const entries = Object.keys(dict[lang]).map(
      (k) => JSON.stringify(k) + ': ' + JSON.stringify(dict[lang][k])
    );
    return JSON.stringify(lang) + ': {' + entries.join(', ') + '}';
  });
  return '{' + langs.join(', ') + '}';
}

/** Each key maps to { en, fr, sw, hi, ar } */
const KEYS = {
  /* ---- Lake Agro ---- */
  'agro.crumb.cat': {
    en: 'Agro Processing',
    fr: 'Agro-industrie',
    sw: 'Usindikaji wa Kilimo',
    hi: 'कृषि प्रसंस्करण',
    ar: 'التصنيع الزراعي'
  },
  'agro.crumb.name': {
    en: 'Lake Agro',
    fr: 'Lake Agro',
    sw: 'Lake Agro',
    hi: 'लेक एग्रो',
    ar: 'ليك أغرو'
  },
  'agro.hero.eyebrow': {
    en: 'Lake Agro · Dar es Salaam',
    fr: 'Lake Agro · Dar es Salaam',
    sw: 'Lake Agro · Dar es Salaam',
    hi: 'लेक एग्रो · दार एस सलाम',
    ar: 'ليك أغرو · دار السلام'
  },
  'agro.hero.title': {
    en: 'Lake Agro',
    fr: 'Lake Agro',
    sw: 'Lake Agro',
    hi: 'लेक एग्रो',
    ar: 'ليك أغرو'
  },
  'agro.hero.lede': {
    en: 'Creating customers and food for life through plantations, integrated Ag Parks and agribusiness processing across Africa.',
    fr: 'Créer des clients et de la nourriture pour la vie grâce aux plantations, aux Ag Parks intégrés et à la transformation agroalimentaire à travers l’Afrique.',
    sw: 'Kuunda wateja na chakula kwa maisha kupitia mashamba, Ag Parks zilizojumuishwa na usindikaji wa kilimo biashara barani Afrika.',
    hi: 'अफ्रीका भर में वृक्षारोपण, एकीकृत एग पार्कों और कृषि-व्यवसाय प्रसंस्करण के माध्यम से ग्राहक और जीवन भर का भोजन बनाना।',
    ar: 'خلق عملاء وغذاء مدى الحياة من خلال المزارع وحدائق الزراعة المتكاملة وتجهيز الأعمال الزراعية في أنحاء أفريقيا.'
  },
  'agro.s1.eyebrow': { en: 'Why We Are', fr: 'Pourquoi nous existons', sw: 'Kwa Nini Tupo', hi: 'हम क्यों हैं', ar: 'لماذا نحن' },
  'agro.s1.title': { en: 'Food Systems for Africa', fr: 'Systèmes alimentaires pour l’Afrique', sw: 'Mifumo ya Chakula kwa Afrika', hi: 'अफ्रीका के लिए खाद्य प्रणाली', ar: 'أنظمة غذائية لأفريقيا' },
  'agro.s1.lede': {
    en: 'Private business communities partnering with governments, development financial institutions (DFIs) and initiatives like the Africa Savannahs Initiative to assist Africa to feed itself and create jobs for youth and women.',
    fr: 'Des communautés d’entreprises privées partenaire des gouvernements, des institutions financières de développement (IFD) et d’initiatives comme l’Africa Savannahs Initiative pour aider l’Afrique à se nourrir et créer des emplois pour les jeunes et les femmes.',
    sw: 'Jumuiya za biashara za kibinafsi zinashirikiana na serikali, taasisi za fedha za maendeleo (DFIs) na mipango kama Africa Savannahs Initiative kusaidia Afrika kujilisha na kuunda ajira kwa vijana na wanawake.',
    hi: 'निजी व्यावसायिक समुदाय सरकारों, विकास वित्तीय संस्थानों (डीएफआई) और अफ्रीका सवानाज़ पहल जैसी पहलों के साथ साझेदारी कर अफ्रीका को आत्मनिर्भर बनाने और युवाओं व महिलाओं के लिए रोजगार सृजित करने में सहायता करते हैं।',
    ar: 'مجتمعات أعمال خاصة تتشارك مع الحكومات ومؤسسات التمويل الإنمائي ومبادرات مثل مبادرة السافانا الأفريقية لمساعدة أفريقيا على إطعام نفسها وخلق فرص عمل للشباب والنساء.'
  },
  'agro.s1.p2': {
    en: 'At least 233 million people were estimated to be hungry or undernourished in sub-Saharan Africa (UN FAO, 2014). Africa’s food challenge is compounded by a population expected to double to 2.4 billion by 2050.',
    fr: 'Au moins 233 millions de personnes étaient estimées affamées ou sous-alimentées en Afrique subsaharienne (FAO, 2014). Le défi alimentaire de l’Afrique est aggravé par une population qui devrait doubler pour atteindre 2,4 milliards d’ici 2050.',
    sw: 'Angalau watu milioni 233 walikadiriwa kuwa na njaa au utapiamlo katika Afrika Kusini mwa Sahara (UN FAO, 2014). Changamoto ya chakula Afrika inaongezeka kwa idadi ya watu inayotarajiwa kuongezeka mara mbili hadi bilioni 2.4 ifikapo 2050.',
    hi: 'उप-सहारा अफ्रीका में कम से कम 233 मिलियन लोग भूखे या कुपोषित अनुमानित थे (यूएन एफएओ, 2014)। अफ्रीका की खाद्य चुनौती 2050 तक 2.4 बिलियन तक दोगुनी होने वाली जनसंख्या से और बढ़ जाती है।',
    ar: 'قُدّر أن ما لا يقل عن 233 مليون شخص يعانون الجوع أو نقص التغذية في أفريقيا جنوب الصحراء (فاو، 2014). ويتفاقم التحدي الغذائي بتضاعف السكان المتوقع إلى 2.4 مليار بحلول 2050.'
  },
  'agro.s1.p3': {
    en: 'Africa’s Agriculture Status Report 2017 (Alliance for a Green Revolution in Africa) notes the continent’s food market is growing rapidly, with opportunities estimated at more than <strong>$1 trillion every year by 2030</strong>, helping substitute food imports with high-value food made in Africa.',
    fr: 'Le rapport 2017 sur l’état de l’agriculture en Afrique (Alliance for a Green Revolution in Africa) note que le marché alimentaire du continent croît rapidement, avec des opportunités estimées à plus de <strong>1 000 milliards de dollars par an d’ici 2030</strong>, pour substituer les importations par des aliments à forte valeur produits en Afrique.',
    sw: 'Ripoti ya Hali ya Kilimo Afrika 2017 (Alliance for a Green Revolution in Africa) inabainisha soko la chakula la bara linakua haraka, na fursa zinazokadiriwa zaidi ya <strong>dola trilioni 1 kila mwaka ifikapo 2030</strong>, kusaidia kubadilisha uagizaji wa chakula na chakula cha thamani kubwa kinachozalishwa Afrika.',
    hi: 'अफ्रीका कृषि स्थिति रिपोर्ट 2017 नोट करती है कि महाद्वीप का खाद्य बाज़ार तेज़ी से बढ़ रहा है, अवसर <strong>2030 तक प्रति वर्ष $1 ट्रिलियन से अधिक</strong> अनुमानित हैं।',
    ar: 'يشير تقرير حالة الزراعة في أفريقيا 2017 إلى نمو سوق الغذاء بسرعة، بفرص تُقدَّر بأكثر من <strong>تريليون دولار سنوياً بحلول 2030</strong> لاستبدال الواردات بأغذية عالية القيمة مصنوعة في أفريقيا.'
  },
  'agro.glance.title': { en: 'At a Glance', fr: 'En un coup d’œil', sw: 'Kwa Muhtasari', hi: 'एक नज़र में', ar: 'لمحة سريعة' },
  'agro.glance.hq': { en: 'HQ city', fr: 'Siège', sw: 'Makao makuu', hi: 'मुख्यालय शहर', ar: 'مدينة المقر' },
  'agro.glance.email': { en: 'Email', fr: 'E-mail', sw: 'Barua pepe', hi: 'ईमेल', ar: 'البريد' },
  'agro.glance.phone': { en: 'Phone', fr: 'Téléphone', sw: 'Simu', hi: 'फ़ोन', ar: 'الهاتف' },
  'agro.glance.tagline': { en: 'Tagline', fr: 'Slogan', sw: 'Kauli mbiu', hi: 'टैगलाइन', ar: 'الشعار' },
  'agro.glance.taglineVal': { en: 'Food for life', fr: 'Nourriture pour la vie', sw: 'Chakula kwa maisha', hi: 'जीवन के लिए भोजन', ar: 'غذاء مدى الحياة' },
  'agro.s2.eyebrow': { en: 'What We Are', fr: 'Ce que nous sommes', sw: 'Sisi Ni Nini', hi: 'हम क्या हैं', ar: 'ما نحن' },
  'agro.s2.title': { en: 'Secure · Establish · Consolidate', fr: 'Sécuriser · Établir · Consolider', sw: 'Linda · Anzisha · Imarisha', hi: 'सुरक्षित · स्थापित · सुदृढ़', ar: 'تأمين · تأسيس · توطيد' },
  'agro.s2.lede': {
    en: 'We secure, establish and consolidate farm platforms via greenfield projects or existing farm acquisitions in selected markets within our network of countries where economies of scale can be achieved.',
    fr: 'Nous sécurisons, établissons et consolidons des plateformes agricoles via des projets greenfield ou des acquisitions de fermes existantes sur des marchés sélectionnés de notre réseau, où des économies d’échelle sont possibles.',
    sw: 'Tunalinda, kuanzisha na kuimarisha majukwaa ya mashamba kupitia miradi mipya au ununuzi wa mashamba yaliyopo katika soko teule ndani ya mtandao wetu wa nchi ambapo uchumi wa kiwango unaweza kufikiwa.',
    hi: 'हम अपने देश नेटवर्क में चयनित बाज़ारों में ग्रीनफील्ड परियोजनाओं या मौजूदा फ़ार्म अधिग्रहणों के माध्यम से फ़ार्म प्लेटफ़ॉर्म सुरक्षित, स्थापित और सुदृढ़ करते हैं।',
    ar: 'نؤمّن ونؤسس ونوطّد منصات المزارع عبر مشاريع جديدة أو استحواذ مزارع قائمة في أسواق مختارة ضمن شبكة بلداننا حيث تتحقق وفورات الحجم.'
  },
  'agro.card.land.title': { en: 'Land Availability', fr: 'Disponibilité des terres', sw: 'Upatikanaji wa Ardhi', hi: 'भूमि उपलब्धता', ar: 'توفر الأراضي' },
  'agro.card.land.body': {
    en: 'Underutilized, cost-effective land with mineralized, diversified soils along water basins and catchments whose mass exceeds farmed land to ensure water perennity over 20 years.',
    fr: 'Terres sous-utilisées et rentables, sols minéralisés et diversifiés le long des bassins versants dont la masse dépasse les terres cultivées pour assurer la pérennité de l’eau sur 20 ans.',
    sw: 'Ardhi isiyotumika vizuri, nafuu, yenye udongo wa madini na tofauti kando ya mabonde ya maji ambayo wingi wake unazidi ardhi inayolimwa ili kuhakikisha maji kwa miaka 20.',
    hi: 'जल घाटियों के साथ कम उपयोग वाली किफायती भूमि, खनिजयुक्त विविध मिट्टी, 20 वर्षों तक जल स्थायित्व सुनिश्चित करने हेतु।',
    ar: 'أراضٍ غير مستغلة وفعّالة التكلفة بتربة معدنية متنوعة على أحواض المياه لضمان استمرارية المياه لأكثر من 20 عاماً.'
  },
  'agro.card.access.title': { en: 'Accessibility', fr: 'Accessibilité', sw: 'Ufikivu', hi: 'पहुँच', ar: 'إمكانية الوصول' },
  'agro.card.access.body': {
    en: 'Countries connected by rail and established transport corridors for accessible set-up or distribution of final produce within country or for export.',
    fr: 'Pays reliés par le rail et des corridors de transport établis pour l’installation ou la distribution des produits finis sur le marché local ou à l’export.',
    sw: 'Nchi zilizounganishwa kwa reli na korido za usafiri zilizoanzishwa kwa uanzishaji au usambazaji wa mazao ndani ya nchi au kwa mauzo nje.',
    hi: 'रेल और स्थापित परिवहन गलियारों से जुड़े देश — घरेलू या निर्यात वितरण के लिए।',
    ar: 'بلدان مترابطة بالسكك والممرات النقلية لتأسيس أو توزيع المنتجات محلياً أو للتصدير.'
  },
  'agro.card.prox.title': { en: 'Proximity', fr: 'Proximité', sw: 'Ukaribu', hi: 'निकटता', ar: 'القرب' },
  'agro.card.prox.body': {
    en: 'Multiple continental export hubs across the network region, including major South East and Asia-facing ports and Atlantic hub access in Namibia.',
    fr: 'Plusieurs hubs d’export continentaux dans la région du réseau, dont d’importants ports vers le Sud-Est et l’Asie, et un accès atlantique en Namibie.',
    sw: 'Vituo vingi vya mauzo ya bara katika eneo la mtandao, ikiwa ni pamoja na bandari kuu za Kusini-Mashariki na zinazoelekea Asia na ufikiaji wa Atlantiki Namibia.',
    hi: 'नेटवर्क क्षेत्र में कई महाद्वीपीय निर्यात हब, दक्षिण-पूर्व और एशिया-मुखी बंदरगाह तथा नामीबिया में अटलांटिक पहुँच सहित।',
    ar: 'عدة مراكز تصدير قارية عبر منطقة الشبكة، بما فيها موانئ رئيسية نحو الجنوب الشرقي وآسيا ووصول أطلسي في ناميبيا.'
  },
  'agro.card.tech.title': { en: 'Technical Know-How', fr: 'Savoir-faire technique', sw: 'Ujuzi wa Kiufundi', hi: 'तकनीकी ज्ञान', ar: 'المعرفة التقنية' },
  'agro.card.tech.body': {
    en: 'Established technical capability in-country for ag technology transfer and adequate management of farms and Integrated Ag Parks.',
    fr: 'Capacité technique établie dans le pays pour le transfert de technologies agricoles et la gestion des fermes et Ag Parks intégrés.',
    sw: 'Uwezo wa kiufundi ulioanzishwa nchini kwa uhamishaji wa teknolojia ya kilimo na usimamizi wa kutosha wa mashamba na Ag Parks zilizojumuishwa.',
    hi: 'कृषि प्रौद्योगिकी हस्तांतरण तथा फ़ार्म व एकीकृत एग पार्क प्रबंधन हेतु देश में स्थापित तकनीकी क्षमता।',
    ar: 'قدرة تقنية راسخة داخل البلد لنقل التكنولوجيا الزراعية وإدارة المزارع وحدائق الزراعة المتكاملة.'
  },
  'agro.card.capital.title': { en: 'Capital Availability', fr: 'Disponibilité des capitaux', sw: 'Upatikanaji wa Mitaji', hi: 'पूँजी उपलब्धता', ar: 'توفر رأس المال' },
  'agro.card.capital.body': {
    en: 'International funding, local ag funding, specialist or development banks, and African institutional funding to bridge food-security needs.',
    fr: 'Financement international, financement agricole local, banques spécialisées ou de développement, et financement institutionnel africain pour la sécurité alimentaire.',
    sw: 'Ufadhili wa kimataifa, ufadhili wa kilimo wa ndani, benki maalum au za maendeleo, na ufadhili wa taasisi za Afrika kuziba mahitaji ya usalama wa chakula.',
    hi: 'अंतरराष्ट्रीय फंडिंग, स्थानीय कृषि फंडिंग, विशेषज्ञ/विकास बैंक और अफ्रीकी संस्थागत फंडिंग।',
    ar: 'تمويل دولي ومحلي زراعي وبنوك متخصصة أو إنمائية وتمويل مؤسسي أفريقي لسد احتياجات الأمن الغذائي.'
  },
  'agro.card.group.title': { en: 'Group Backing', fr: 'Soutien du Groupe', sw: 'Uungaji Mkono wa Kikundi', hi: 'समूह समर्थन', ar: 'دعم المجموعة' },
  'agro.card.group.body': {
    en: 'Central Lake Group functions (IT, legal, audit, finance, treasury, HR) support Lake Agro operations and growth plans.',
    fr: 'Les fonctions centrales du Lake Group (IT, juridique, audit, finance, trésorerie, RH) soutiennent les opérations et la croissance de Lake Agro.',
    sw: 'Kazi kuu za Lake Group (IT, sheria, ukaguzi, fedha, hazina, HR) zinaunga mkono shughuli na mipango ya ukuaji ya Lake Agro.',
    hi: 'लेक ग्रुप के केंद्रीय कार्य (आईटी, कानूनी, ऑडिट, वित्त, ट्रेजरी, एचआर) लेक एग्रो संचालन और विकास का समर्थन करते हैं।',
    ar: 'وظائف مجموعة ليك المركزية (تقنية المعلومات، القانوني، التدقيق، المالية، الخزينة، الموارد البشرية) تدعم عمليات ونمو ليك أغرو.'
  },
  'agro.s3.eyebrow': { en: 'How We Are', fr: 'Comment nous opérons', sw: 'Jinsi Tulivyo', hi: 'हम कैसे हैं', ar: 'كيف نعمل' },
  'agro.s3.title': { en: '3P Strategy - Prep · Plan · Process', fr: 'Stratégie 3P - Préparer · Planifier · Transformer', sw: 'Mkakati wa 3P - Andaa · Panga · Sindika', hi: '3P रणनीति - तैयारी · योजना · प्रक्रिया', ar: 'استراتيجية 3P - إعداد · تخطيط · معالجة' },
  'agro.s3.prep.title': { en: 'Prep', fr: 'Préparer', sw: 'Andaa', hi: 'तैयारी', ar: 'إعداد' },
  'agro.s3.prep.body': {
    en: 'Deploy Phase 1 growth; rapid turnaround of underperforming Phase 2 acquisitions; lift yields and land development on greenfield plantation farms.',
    fr: 'Déployer la croissance de la Phase 1 ; redressement rapide des acquisitions sous-performantes de Phase 2 ; augmenter les rendements et le développement des terres sur les plantations greenfield.',
    sw: 'Kupeleka ukuaji wa Awamu ya 1; kugeuza haraka ununuzi wa Awamu ya 2 usiofanya vizuri; kuongeza mazao na maendeleo ya ardhi kwenye mashamba mapya.',
    hi: 'चरण 1 विकास तैनात करें; चरण 2 के कमज़ोर अधिग्रहणों का तेज़ सुधार; ग्रीनफील्ड बागानों पर उपज और भूमि विकास बढ़ाएँ।',
    ar: 'نشر نمو المرحلة 1؛ إنعاش سريع لاستحواذات المرحلة 2 ضعيفة الأداء؛ رفع الغلات وتطوير الأراضي في المزارع الجديدة.'
  },
  'agro.s3.plan.title': { en: 'Plan', fr: 'Planifier', sw: 'Panga', hi: 'योजना', ar: 'تخطيط' },
  'agro.s3.plan.body': {
    en: 'Add Integrated Ag Parks in Phase 1 for consolidation and value addition; select and acquire Phase 2 market-entry farms.',
    fr: 'Ajouter des Ag Parks intégrés en Phase 1 pour la consolidation et la valeur ajoutée ; sélectionner et acquérir les fermes d’entrée de marché en Phase 2.',
    sw: 'Ongeza Ag Parks zilizojumuishwa katika Awamu ya 1 kwa uimarishaji na ongezeko la thamani; chagua na nunua mashamba ya kuingia soko Awamu ya 2.',
    hi: 'समेकन व मूल्यवर्धन हेतु चरण 1 में एकीकृत एग पार्क जोड़ें; चरण 2 बाज़ार-प्रवेश फ़ार्म चुनें व अधिग्रहित करें।',
    ar: 'إضافة حدائق زراعة متكاملة في المرحلة 1 للتوطيد والقيمة المضافة؛ اختيار واستحواذ مزارع دخول السوق في المرحلة 2.'
  },
  'agro.s3.process.title': { en: 'Process', fr: 'Transformer', sw: 'Sindika', hi: 'प्रक्रिया', ar: 'معالجة' },
  'agro.s3.process.body': {
    en: 'Stand up processing as Phase 1 farms stabilize; reorganize value-addition facilities to accommodate Integrated Ag Parks in Phase 2.',
    fr: 'Mettre en place la transformation à mesure que les fermes de Phase 1 se stabilisent ; réorganiser les installations de valeur ajoutée pour les Ag Parks intégrés en Phase 2.',
    sw: 'Anzisha usindikaji mashamba ya Awamu ya 1 yanapotulia; panga upya vifaa vya ongezeko la thamani ili kutosheleza Ag Parks zilizojumuishwa Awamu ya 2.',
    hi: 'चरण 1 फ़ार्म स्थिर होने पर प्रसंस्करण शुरू करें; चरण 2 में एकीकृत एग पार्कों हेतु मूल्यवर्धन सुविधाएँ पुनर्व्यवस्थित करें।',
    ar: 'إطلاق المعالجة مع استقرار مزارع المرحلة 1؛ إعادة تنظيم مرافق القيمة المضافة لاستيعاب الحدائق المتكاملة في المرحلة 2.'
  },
  'agro.s3.yields': {
    en: 'Target average yields above <strong>11 t/ha</strong> of arable land across commoditized crops including wheat, soybean, maize, rice, sunflower, sugar and protein (beef), with rotational diversification into teak, beans and horticulture (fruit) where land permits.',
    fr: 'Viser des rendements moyens supérieurs à <strong>11 t/ha</strong> de terres arables sur les cultures commoditisées (blé, soja, maïs, riz, tournesol, sucre et protéines bovines), avec diversification rotationnelle vers le teck, les haricots et l’horticulture (fruits) là où la terre le permet.',
    sw: 'Kulenga wastani wa mazao juu ya <strong>tani 11/ha</strong> za ardhi inayolimwa kwa mazao ya biashara yakiwemo ngano, soya, mahindi, mchele, alizeti, sukari na protini (nyama ya ng’ombe), pamoja na mzunguko wa teak, maharagwe na matunda pale ardhi inaporuhusu.',
    hi: 'लक्ष्य औसत उपज <strong>11 टन/हेक्टेयर</strong> से अधिक — गेहूँ, सोया, मक्का, चावल, सूरजमुखी, चीनी और प्रोटीन (बीफ़) सहित, जहाँ भूमि अनुमति दे वहाँ सागौन, फलियाँ और बागवानी।',
    ar: 'استهداف غلات متوسطة فوق <strong>11 طن/هكتار</strong> عبر محاصيل السلع بما فيها القمح والصويا والذرة والأرز وعباد الشمس والسكر والبروتين (لحم البقر)، مع تنويع دوراني حيث تسمح الأرض.'
  },
  'agro.s4.eyebrow': { en: 'Crops & Outputs', fr: 'Cultures et productions', sw: 'Mazao na Matokeo', hi: 'फसलें और उत्पादन', ar: 'المحاصيل والمخرجات' },
  'agro.s4.title': { en: 'Production Focus', fr: 'Priorité de production', sw: 'Lengo la Uzalishaji', hi: 'उत्पादन फोकस', ar: 'تركيز الإنتاج' },
  'agro.s4.grains.title': { en: 'Grains & Oilseeds', fr: 'Céréales et oléagineux', sw: 'Nafaka na Mbegu za Mafuta', hi: 'अनाज और तिलहन', ar: 'الحبوب والبذور الزيتية' },
  'agro.s4.grains.body': {
    en: 'Wheat, maize, rice, soybean and sunflower platforms for regional food security and processing feedstocks.',
    fr: 'Plateformes blé, maïs, riz, soja et tournesol pour la sécurité alimentaire régionale et les matières premières de transformation.',
    sw: 'Majukwaa ya ngano, mahindi, mchele, soya na alizeti kwa usalama wa chakula wa kikanda na malighafi za usindikaji.',
    hi: 'क्षेत्रीय खाद्य सुरक्षा और प्रसंस्करण फीडस्टॉक हेतु गेहूँ, मक्का, चावल, सोया और सूरजमुखी प्लेटफ़ॉर्म।',
    ar: 'منصات القمح والذرة والأرز والصويا وعباد الشمس لأمن الغذاء الإقليمي ومواد التجهيز.'
  },
  'agro.s4.sugar.title': { en: 'Sugar & Cash Crops', fr: 'Sucre et cultures de rente', sw: 'Sukari na Mazao ya Biashara', hi: 'चीनी और नकदी फसलें', ar: 'السكر والمحاصيل النقدية' },
  'agro.s4.sugar.body': {
    en: 'Sugar and related cash crops as core processing feedstocks within the Ag Park model.',
    fr: 'Sucre et cultures de rente associées comme matières premières centrales du modèle Ag Park.',
    sw: 'Sukari na mazao ya biashara yanayohusiana kama malighafi kuu za usindikaji ndani ya mfano wa Ag Park.',
    hi: 'एग पार्क मॉडल में मुख्य प्रसंस्करण फीडस्टॉक के रूप में चीनी और संबंधित नकदी फसलें।',
    ar: 'السكر والمحاصيل النقدية ذات الصلة كمواد أساسية للتجهيز ضمن نموذج حديقة الزراعة.'
  },
  'agro.s4.protein.title': { en: 'Protein & Diversification', fr: 'Protéines et diversification', sw: 'Protini na Utamaduni', hi: 'प्रोटीन और विविधीकरण', ar: 'البروتين والتنويع' },
  'agro.s4.protein.body': {
    en: 'Beef protein plus teak, beans and fruit horticulture in buffer spaces where land permits.',
    fr: 'Protéines bovines, plus teck, haricots et horticulture fruitière dans les espaces tampon là où la terre le permet.',
    sw: 'Protini ya nyama ya ng’ombe pamoja na teak, maharagwe na matunda katika nafasi za ziada pale ardhi inaporuhusu.',
    hi: 'जहाँ भूमि अनुमति दे, बफ़र क्षेत्रों में बीफ़ प्रोटीन तथा सागौन, फलियाँ और फल बागवानी।',
    ar: 'بروتين لحم البقر مع الساج والفاصوليا والبستنة الفاكهية في المساحات الاحتياطية حيث تسمح الأرض.'
  },
  'agro.s5.eyebrow': { en: 'Projects', fr: 'Projets', sw: 'Miradi', hi: 'परियोजनाएँ', ar: 'المشاريع' },
  'agro.s5.title': { en: 'Plantations & Ag Parks', fr: 'Plantations et Ag Parks', sw: 'Mashamba na Ag Parks', hi: 'बागान और एग पार्क', ar: 'المزارع وحدائق الزراعة' },
  'agro.s5.serenje.title': { en: 'Serenje Plantation', fr: 'Plantation de Serenje', sw: 'Shamba la Serenje', hi: 'सेरेंजे बागान', ar: 'مزرعة سيرينجي' },
  'agro.s5.serenje.body': {
    en: 'Operations oversee the Serenje plantation platform with specialties in agronomy, crop harvesting, disease control, seed/fertilizer/input management, equipment procurement, works contracting and irrigation project oversight.',
    fr: 'Les opérations supervisent la plateforme Serenje avec des expertises en agronomie, récolte, lutte contre les maladies, gestion des intrants, achats d’équipements, travaux et irrigation.',
    sw: 'Shughuli zinasimamia jukwaa la shamba la Serenje kwa utaalamu wa agronomia, uvunaji, udhibiti wa magonjwa, usimamizi wa mbegu/mbolea/ingizo, ununuzi wa vifaa, kazi za ujenzi na miradi ya umwagiliaji.',
    hi: 'सेरेंजे बागान प्लेटफ़ॉर्म का संचालन — कृषि विज्ञान, कटाई, रोग नियंत्रण, इनपुट प्रबंधन, उपकरण और सिंचाई।',
    ar: 'تشرف العمليات على منصة مزرعة سيرينجي بتخصصات في الزراعة والحصاد ومكافحة الأمراض وإدارة المدخلات والمعدات والري.'
  },
  'agro.s5.parks.title': { en: 'Integrated Ag Parks', fr: 'Ag Parks intégrés', sw: 'Ag Parks Zilizojumuishwa', hi: 'एकीकृत एग पार्क', ar: 'حدائق زراعة متكاملة' },
  'agro.s5.parks.body': {
    en: 'Ag Parks consolidate produce and add value through processing. As the first Ag Park team is constituted, capacity is expected to roughly double, supported by Rising Stars projects that attract and retain talent.',
    fr: 'Les Ag Parks consolident la production et ajoutent de la valeur par la transformation. Avec la première équipe, la capacité devrait approximativement doubler, soutenue par les projets Rising Stars.',
    sw: 'Ag Parks zinajumuisha mazao na kuongeza thamani kupitia usindikaji. Timu ya kwanza inapoundwa, uwezo unatarajiwa kuongezeka karibu mara mbili, ukiungwa mkono na miradi ya Rising Stars.',
    hi: 'एग पार्क उत्पादन समेकित कर प्रसंस्करण से मूल्य बढ़ाते हैं। पहली टीम गठित होने पर क्षमता लगभग दोगुनी होने की उम्मीद है।',
    ar: 'توطّد حدائق الزراعة الإنتاج وتضيف قيمة عبر التجهيز. مع تشكيل أول فريق يُتوقع أن تتضاعف السعة تقريباً بدعم مشاريع Rising Stars.'
  },
  'agro.s6.eyebrow': { en: 'People', fr: 'Personnes', sw: 'Watu', hi: 'लोग', ar: 'الأشخاص' },
  'agro.s6.title': { en: 'Human Capital', fr: 'Capital humain', sw: 'Rasilimali Watu', hi: 'मानव पूँजी', ar: 'رأس المال البشري' },
  'agro.s6.lede': {
    en: 'People are Lake Agro’s biggest company asset. Farming does not exist without human capital and equity. About 60 roles oversee Serenje plantation and Tanzania regional offices, scaling as Ag Park teams form.',
    fr: 'Les personnes sont le plus grand actif de Lake Agro. L’agriculture n’existe pas sans capital humain. Environ 60 rôles supervisent Serenje et les bureaux régionaux en Tanzanie, en s’étendant avec les équipes Ag Park.',
    sw: 'Watu ndio rasilimali kubwa zaidi ya Lake Agro. Kilimo hakipo bila rasilimali watu. Majukumu takriban 60 yanasimamia shamba la Serenje na ofisi za kikanda Tanzania, yakipanuka timu za Ag Park zinavyoundwa.',
    hi: 'लोग लेक एग्रो की सबसे बड़ी संपत्ति हैं। लगभग 60 भूमिकाएँ सेरेंजे और तंजानिया क्षेत्रीय कार्यालयों का संचालन करती हैं।',
    ar: 'الأشخاص أكبر أصول ليك أغرو. نحو 60 دوراً يشرف على مزرعة سيرينجي ومكاتب تنزانيا الإقليمية ويتوسع مع فرق حدائق الزراعة.'
  },
  'agro.s6.agronomy': { en: 'Agronomy', fr: 'Agronomie', sw: 'Agronomia', hi: 'कृषि विज्ञान', ar: 'علم الزراعة' },
  'agro.s6.agronomy.d': { en: 'Crop science, harvesting, disease control', fr: 'Science des cultures, récolte, lutte contre les maladies', sw: 'Sayansi ya mazao, uvunaji, udhibiti wa magonjwa', hi: 'फसल विज्ञान, कटाई, रोग नियंत्रण', ar: 'علوم المحاصيل والحصاد ومكافحة الأمراض' },
  'agro.s6.inputs': { en: 'Inputs', fr: 'Intrants', sw: 'Ingizo', hi: 'इनपुट', ar: 'المدخلات' },
  'agro.s6.inputs.d': { en: 'Seed, fertilizer and input management', fr: 'Gestion des semences, engrais et intrants', sw: 'Usimamizi wa mbegu, mbolea na ingizo', hi: 'बीज, उर्वरक और इनपुट प्रबंधन', ar: 'إدارة البذور والأسمدة والمدخلات' },
  'agro.s6.equip': { en: 'Equipment', fr: 'Équipement', sw: 'Vifaa', hi: 'उपकरण', ar: 'المعدات' },
  'agro.s6.equip.d': { en: 'Fleet management and procurement', fr: 'Gestion de flotte et achats', sw: 'Usimamizi wa meli na ununuzi', hi: 'बेड़ा प्रबंधन और खरीद', ar: 'إدارة الأسطول والمشتريات' },
  'agro.s6.irrig': { en: 'Irrigation', fr: 'Irrigation', sw: 'Umwagiliaji', hi: 'सिंचाई', ar: 'الري' },
  'agro.s6.irrig.d': { en: 'Works, contracting and water projects', fr: 'Travaux, contrats et projets hydrauliques', sw: 'Kazi, mikataba na miradi ya maji', hi: 'कार्य, ठेके और जल परियोजनाएँ', ar: 'الأعمال والعقود ومشاريع المياه' },
  'agro.s6.finance': { en: 'Finance', fr: 'Finance', sw: 'Fedha', hi: 'वित्त', ar: 'المالية' },
  'agro.s6.finance.d': { en: 'Control, treasury and planning', fr: 'Contrôle, trésorerie et planification', sw: 'Udhibiti, hazina na mipango', hi: 'नियंत्रण, ट्रेजरी और योजना', ar: 'الرقابة والخزينة والتخطيط' },
  'agro.s6.strategy': { en: 'Strategy', fr: 'Stratégie', sw: 'Mkakati', hi: 'रणनीति', ar: 'الاستراتيجية' },
  'agro.s6.strategy.d': { en: 'Ag project planning and leadership', fr: 'Planification et leadership de projets agricoles', sw: 'Mipango ya miradi ya kilimo na uongozi', hi: 'कृषि परियोजना योजना और नेतृत्व', ar: 'تخطيط المشاريع الزراعية والقيادة' },
  'agro.s6.it': { en: 'Group IT/Legal', fr: 'IT / Juridique Groupe', sw: 'IT/Sheria za Kikundi', hi: 'समूह आईटी/कानूनी', ar: 'تقنية/قانوني المجموعة' },
  'agro.s6.it.d': { en: 'Shared Lake Group central roles', fr: 'Rôles centraux partagés du Lake Group', sw: 'Majukumu ya kati yaliyoshirikiwa ya Lake Group', hi: 'साझा लेक ग्रुप केंद्रीय भूमिकाएँ', ar: 'أدوار مركزية مشتركة لمجموعة ليك' },
  'agro.s6.talent': { en: 'Talent', fr: 'Talents', sw: 'Vipaji', hi: 'प्रतिभा', ar: 'المواهب' },
  'agro.s6.talent.d': { en: 'Rising Stars and sustainability pools', fr: 'Rising Stars et viviers durabilité', sw: 'Rising Stars na mabwawa ya uendelevu', hi: 'राइजिंग स्टार्स और स्थिरता पूल', ar: 'Rising Stars ومجموعات الاستدامة' },
  'agro.s7.eyebrow': { en: 'Commitments', fr: 'Engagements', sw: 'Ahadi', hi: 'प्रतिबद्धताएँ', ar: 'الالتزامات' },
  'agro.s7.title': { en: 'People Support Our Business', fr: 'Les personnes soutiennent notre activité', sw: 'Watu Wanasaidia Biashara Yetu', hi: 'लोग हमारे व्यवसाय का समर्थन करते हैं', ar: 'الأشخاص يدعمون أعمالنا' },
  'agro.s7.lede': {
    en: 'Programs and pledges from Lake Agro’s commitments: local content, grower support, health, training and E/S standards.',
    fr: 'Programmes et engagements de Lake Agro : contenu local, soutien aux producteurs, santé, formation et normes E/S.',
    sw: 'Programu na ahadi kutoka kwa Lake Agro: maudhui ya ndani, msaada wa wakulima, afya, mafunzo na viwango nE/S.',
    hi: 'लेक एग्रो प्रतिबद्धताएँ: स्थानीय सामग्री, उत्पादक समर्थन, स्वास्थ्य, प्रशिक्षण और ई/एस मानक।',
    ar: 'برامج وتعهدات ليك أغرو: المحتوى المحلي ودعم المزارعين والصحة والتدريب ومعايير البيئة والاجتماع.'
  },
  'agro.s7.grower.title': { en: 'Grower Programs', fr: 'Programmes producteurs', sw: 'Programu za Wakulima', hi: 'उत्पादक कार्यक्रम', ar: 'برامج المزارعين' },
  'agro.s7.grower.1': { en: 'Local content and direct-to-farm contracts', fr: 'Contenu local et contrats directs aux fermes', sw: 'Maudhui ya ndani na mikataba moja kwa moja kwa shamba', hi: 'स्थानीय सामग्री और सीधे-फ़ार्म अनुबंध', ar: 'محتوى محلي وعقود مباشرة للمزارع' },
  'agro.s7.grower.2': { en: 'Private-sector connection platform', fr: 'Plateforme de connexion secteur privé', sw: 'Jukwaa la kuunganisha sekta binafsi', hi: 'निजी क्षेत्र कनेक्शन प्लेटफ़ॉर्म', ar: 'منصة ربط القطاع الخاص' },
  'agro.s7.grower.3': { en: 'Mechanization workshops and demos', fr: 'Ateliers et démos de mécanisation', sw: 'Warsha na maonyesho ya mitambo', hi: 'मशीनीकरण कार्यशालाएँ और डेमो', ar: 'ورش ومظاهرات الميكنة' },
  'agro.s7.grower.4': { en: 'AMCO structuring around growers', fr: 'Structuration AMCO autour des producteurs', sw: 'Muundo wa AMCO kuzunguka wakulima', hi: 'उत्पादकों के इर्द-गिर्द AMCO संरचना', ar: 'هيكلة AMCO حول المزارعين' },
  'agro.s7.grower.5': { en: 'Inputs/outputs and green-farming training', fr: 'Formation intrants/sorties et agriculture verte', sw: 'Mafunzo ya ingizo/matokeo na kilimo kijani', hi: 'इनपुट/आउटपुट और हरित खेती प्रशिक्षण', ar: 'تدريب المدخلات/المخرجات والزراعة الخضراء' },
  'agro.s7.health.title': { en: 'Health Support', fr: 'Soutien santé', sw: 'Msaada wa Afya', hi: 'स्वास्थ्य समर्थन', ar: 'الدعم الصحي' },
  'agro.s7.health.1': { en: 'Support health-centre facilities at plantations and Ag Parks', fr: 'Soutenir les centres de santé sur plantations et Ag Parks', sw: 'Kusaidia vituo vya afya kwenye mashamba na Ag Parks', hi: 'बागानों और एग पार्कों में स्वास्थ्य केंद्र सहायता', ar: 'دعم مرافق المراكز الصحية في المزارع والحدائق' },
  'agro.s7.health.2': { en: 'Stocked pharmacy and dispensary', fr: 'Pharmacie et dispensaire approvisionnés', sw: 'Duka la dawa na dispensari yenye stoku', hi: 'स्टॉक वाली फार्मेसी और डिस्पेंसरी', ar: 'صيدلية ومستوصف مجهزان' },
  'agro.s7.health.3': { en: 'Emergency and operating rooms', fr: 'Salles d’urgence et opératoires', sw: 'Vyumba vya dharura na upasuaji', hi: 'आपातकालीन और ऑपरेटिंग रूम', ar: 'غرف طوارئ وعمليات' },
  'agro.s7.health.4': { en: 'Medivac and air-evacuation readiness', fr: 'Préparation médivac et évacuation aérienne', sw: 'Utayari wa medivac na uokoaji wa angani', hi: 'मेडीवैक और हवाई निकासी तैयारी', ar: 'جاهزية الإخلاء الطبي والجوي' },
  'agro.s7.health.5': { en: 'Specialist snake and arachnid treatment capacity', fr: 'Capacité de traitement spécialisé morsures / arachnides', sw: 'Uwezo wa matibabu ya nyoka na wadudu wenye sumu', hi: 'साँप और आराक्निड उपचार क्षमता', ar: 'قدرة علاج متخصص للثعابين والعناكب' },
  'agro.s7.train.title': { en: 'Agri Training', fr: 'Formation agricole', sw: 'Mafunzo ya Kilimo', hi: 'कृषि प्रशिक्षण', ar: 'التدريب الزراعي' },
  'agro.s7.train.1': { en: 'Vocational centres for farmers, workers and specialists', fr: 'Centres professionnels pour agriculteurs, ouvriers et spécialistes', sw: 'Vituo vya ufundi kwa wakulima, wafanyakazi na wataalamu', hi: 'किसानों, कर्मचारियों और विशेषज्ञों के लिए व्यावसायिक केंद्र', ar: 'مراكز مهنية للمزارعين والعمال والمتخصصين' },
  'agro.s7.train.2': { en: 'Mechanization and processing value-chain training', fr: 'Formation mécanisation et chaîne de valeur transformation', sw: 'Mafunzo ya mitambo na mnyororo wa thamani wa usindikaji', hi: 'मशीनीकरण और प्रसंस्करण मूल्य-श्रृंखला प्रशिक्षण', ar: 'تدريب الميكنة وسلسلة قيمة التجهيز' },
  'agro.s7.train.3': { en: 'HSE programs in commercial farming', fr: 'Programmes HSE en agriculture commerciale', sw: 'Programu za HSE katika kilimo cha kibiashara', hi: 'वाणिज्यिक खेती में एचएसई कार्यक्रम', ar: 'برامج الصحة والسلامة في الزراعة التجارية' },
  'agro.s7.train.4': { en: 'Machinery and equipment technical courses', fr: 'Cours techniques machines et équipements', sw: 'Kozi za kiufundi za mashine na vifaa', hi: 'मशीनरी और उपकरण तकनीकी पाठ्यक्रम', ar: 'دورات تقنية للآلات والمعدات' },
  'agro.s7.train.5': { en: 'Seed/crop and environmental management certifications', fr: 'Certifications semences/cultures et gestion environnementale', sw: 'Vyeti vya usimamizi wa mbegu/mazao na mazingira', hi: 'बीज/फसल और पर्यावरण प्रबंधन प्रमाणन', ar: 'شهادات إدارة البذور/المحاصيل والبيئة' },
  'agro.s7.csr.title': { en: 'Corporate Social Responsibility', fr: 'Responsabilité sociétale', sw: 'Wajibu wa Kijamii wa Kampuni', hi: 'कॉर्पोरेट सामाजिक जिम्मेदारी', ar: 'المسؤولية الاجتماعية للشركات' },
  'agro.s7.csr.body': {
    en: 'Lake Group considers contribution to the community a high priority. We create local labour, train employees and improve professional know-how across operations.',
    fr: 'Lake Group considère la contribution à la communauté comme une priorité. Nous créons de l’emploi local, formons les employés et renforçons le savoir-faire.',
    sw: 'Lake Group inaona mchango kwa jamii kuwa kipaumbele cha juu. Tunaunda ajira za ndani, kuwafundisha wafanyakazi na kuboresha ujuzi wa kitaalamu.',
    hi: 'लेक ग्रुप समुदाय योगदान को उच्च प्राथमिकता देता है। हम स्थानीय रोज़गार बनाते हैं और कर्मचारियों को प्रशिक्षित करते हैं।',
    ar: 'تعتبر مجموعة ليك المساهمة المجتمعية أولوية عالية. نخلق عمالة محلية وندرب الموظفين ونحسّن المعرفة المهنية.'
  },
  'agro.s7.es.title': { en: 'Environmental & Social', fr: 'Environnement & social', sw: 'Mazingira na Jamii', hi: 'पर्यावरण और सामाजिक', ar: 'البيئة والاجتماع' },
  'agro.s7.es.body': {
    en: 'Projects follow high E/S standards, including IFC Performance Standards for new CAPEX. No people are harmed, resettled or lose land or property as a result of our activities. Dedicated teams ensure compliance on each project.',
    fr: 'Les projets suivent des normes E/S élevées, dont les normes de performance IFC pour les nouveaux CAPEX. Personne n’est lésé, déplacé ni privé de terres. Des équipes dédiées assurent la conformité.',
    sw: 'Miradi inafuata viwango vya juu vya E/S, ikiwa ni pamoja na Viwango vya Utendaji vya IFC kwa CAPEX mpya. Hakuna watu wanaoumizwa, kuhamishwa au kupoteza ardhi. Timu maalum zinahakikisha uzingatiaji.',
    hi: 'परियोजनाएँ उच्च ई/एस मानकों का पालन करती हैं, जिसमें नए कैपेक्स हेतु आईएफसी मानक शामिल हैं। समर्पित टीमें अनुपालन सुनिश्चित करती हैं।',
    ar: 'تتبع المشاريع معايير بيئة/اجتماع عالية بما فيها معايير أداء IFC للنفقات الرأسمالية الجديدة. فرق مخصصة تضمن الامتثال في كل مشروع.'
  },
  'agro.s8.eyebrow': { en: 'Quality Sustainability', fr: 'Durabilité de qualité', sw: 'Uendelevu wa Ubora', hi: 'गुणवत्ता स्थिरता', ar: 'استدامة الجودة' },
  'agro.s8.title': { en: 'Ensures Sustainability', fr: 'Garantir la durabilité', sw: 'Inahakikisha Uendelevu', hi: 'स्थिरता सुनिश्चित करता है', ar: 'يضمن الاستدامة' },
  'agro.s8.p1': {
    en: 'All departments (IT, legal counsel, auditing and human resources) are streamlined to help achieve future strategies. A talent pool of human resources allows Lake Agro to operate and maintain project sustainability financially, socially and on a production basis.',
    fr: 'Tous les départements (IT, juridique, audit, RH) sont rationalisés pour les stratégies futures. Un vivier de talents permet à Lake Agro d’assurer la durabilité financière, sociale et productive des projets.',
    sw: 'Idara zote (IT, ushauri wa kisheria, ukaguzi na rasilimali watu) zimepangwa kusaidia mikakati ya baadaye. Bwawa la vipaji linaruhusu Lake Agro kuendesha na kudumisha uendelevu wa miradi kifedha, kijamii na uzalishaji.',
    hi: 'सभी विभाग भविष्य की रणनीतियों हेतु सुव्यवस्थित हैं। प्रतिभा पूल लेक एग्रो को वित्तीय, सामाजिक और उत्पादन आधार पर स्थिरता बनाए रखने देता है।',
    ar: 'تُبسَّط جميع الإدارات لدعم الاستراتيجيات المستقبلية. ويتيح مجمع المواهب لليك أغرو الحفاظ على استدامة المشاريع مالياً واجتماعياً وإنتاجياً.'
  },
  'agro.s8.p2': {
    en: 'Leadership technical know-how entrenches a deep understanding of how to plan, run and execute plantations - and how to secure or improve them over time.',
    fr: 'Le savoir-faire technique du leadership ancre une compréhension profonde de la planification, de l’exploitation et de l’amélioration des plantations dans le temps.',
    sw: 'Ujuzi wa kiufundi wa uongozi unajenga uelewa wa kina wa kupanga, kuendesha na kutekeleza mashamba — na jinsi ya kuyalinda au kuboresha kwa muda.',
    hi: 'नेतृत्व का तकनीकी ज्ञान बागानों को योजनाबद्ध, संचालित और समय के साथ सुधारने की गहरी समझ देता है।',
    ar: 'ترسخ معرفة القيادة التقنية فهماً عميقاً لتخطيط وتشغيل وتحسين المزارع مع الزمن.'
  },
  'agro.s9.eyebrow': { en: 'Locations', fr: 'Emplacements', sw: 'Maeneo', hi: 'स्थान', ar: 'المواقع' },
  'agro.s9.title': { en: 'Reach Lake Agro', fr: 'Contacter Lake Agro', sw: 'Wasiliana na Lake Agro', hi: 'लेक एग्रो से संपर्क', ar: 'تواصل مع ليك أغرو' },
  'agro.s9.name': { en: 'Lake Agro', fr: 'Lake Agro', sw: 'Lake Agro', hi: 'लेक एग्रो', ar: 'ليك أغرو' },
  'agro.s9.address': { en: 'Address', fr: 'Adresse', sw: 'Anwani', hi: 'पता', ar: 'العنوان' },
  'agro.s9.address.line': { en: 'Plot 72 & 73, Vijibweni Area, Kigamboni', fr: 'Parcelles 72 et 73, zone Vijibweni, Kigamboni', sw: 'Plot 72 & 73, Eneo la Vijibweni, Kigamboni', hi: 'प्लॉट 72 और 73, विजीब्वेनी, किगाम्बोनी', ar: 'القطعتان 72 و73، منطقة فيجيبويني، كيغامبوني' },
  'agro.s9.address.dim': { en: 'P.O. Box 5055, Dar es Salaam, Tanzania · Serenje plantation operations', fr: 'B.P. 5055, Dar es Salaam, Tanzanie · Opérations plantation Serenje', sw: 'S.L.P. 5055, Dar es Salaam, Tanzania · Shughuli za shamba la Serenje', hi: 'पी.ओ. बॉक्स 5055, दार एस सलाम · सेरेंजे बागान', ar: 'ص.ب. 5055، دار السلام، تنزانيا · عمليات مزرعة سيرينجي' },
  'agro.s9.email': { en: 'Email', fr: 'E-mail', sw: 'Barua pepe', hi: 'ईमेल', ar: 'البريد' },
  'agro.s9.phone': { en: 'Phone', fr: 'Téléphone', sw: 'Simu', hi: 'फ़ोन', ar: 'الهاتف' },
  'agro.s9.web': { en: 'Website', fr: 'Site web', sw: 'Tovuti', hi: 'वेबसाइट', ar: 'الموقع' },
  'agro.s9.web.dim': { en: 'Content mirrored on this Lake Group page', fr: 'Contenu repris sur cette page Lake Group', sw: 'Maudhui yameakisiwa kwenye ukurasa huu wa Lake Group', hi: 'सामग्री इस लेक ग्रुप पृष्ठ पर प्रतिबिंबित', ar: 'المحتوى معكوس على صفحة مجموعة ليك هذه' },

  /* ---- ATL ---- */
  'atl.crumb.cat': {
    en: 'Manufacturing',
    fr: 'Fabrication',
    sw: 'Uzalishaji',
    hi: 'विनिर्माण',
    ar: 'التصنيع'
  },
  'atl.crumb.name': { en: 'ATL', fr: 'ATL', sw: 'ATL', hi: 'ATL', ar: 'ATL' },
  'atl.hero.eyebrow': {
    en: 'ATL Limited · Est. 2019',
    fr: 'ATL Limited · Fondée en 2019',
    sw: 'ATL Limited · Ilianzishwa 2019',
    hi: 'ATL Limited · स्थापना 2019',
    ar: 'ATL Limited · تأسست 2019'
  },
  'atl.hero.title': { en: 'ATL', fr: 'ATL', sw: 'ATL', hi: 'ATL', ar: 'ATL' },
  'atl.hero.lede': {
    en: 'Aluminium Trailers Ltd - Tanzania’s aluminium fuel tanker and custom trailer manufacturer. Your trailer partner.',
    fr: 'Aluminium Trailers Ltd - fabricant tanzanien de citernes à carburant en aluminium et remorques sur mesure. Votre partenaire remorques.',
    sw: 'Aluminium Trailers Ltd - mtengenezaji wa matangi ya mafuta ya aluminium na trela maalum Tanzania. Mshirika wako wa trela.',
    hi: 'एल्युमिनियम ट्रेलर्स लिमिटेड — तंजानिया का एल्युमिनियम ईंधन टैंकर और कस्टम ट्रेलर निर्माता। आपका ट्रेलर साथी।',
    ar: 'ألومنيوم تريلرز المحدودة — مصنّع صهاريج الوقود الألومنيوم والمقطورات المخصصة في تنزانيا. شريكك في المقطورات.'
  },
  'atl.s1.eyebrow': { en: 'Company Introduction', fr: 'Présentation', sw: 'Utangulizi wa Kampuni', hi: 'कंपनी परिचय', ar: 'مقدمة الشركة' },
  'atl.s1.title': { en: 'Engineered To Last', fr: 'Conçus pour durer', sw: 'Imeundwa Kudumu', hi: 'टिकाऊ इंजीनियरिंग', ar: 'مصممة لتدوم' },
  'atl.s1.lede': {
    en: 'ATL Limited (Aluminum Trailers Ltd), established in 2019, is the only manufacturer of high-quality aluminum trailers in Tanzania. We specialize in innovative, durable fuel transportation solutions for East and Central Africa.',
    fr: 'ATL Limited (Aluminum Trailers Ltd), fondée en 2019, est le seul fabricant de remorques aluminium de haute qualité en Tanzanie. Nous proposons des solutions durables de transport de carburant pour l’Afrique de l’Est et Centrale.',
    sw: 'ATL Limited (Aluminum Trailers Ltd), iliyoanzishwa 2019, ndiyo mtengenezaji pekee wa trela za aluminium za ubora wa juu Tanzania. Tunabobea katika suluhisho bunifu, imara za usafirishaji wa mafuta Afrika Mashariki na Kati.',
    hi: 'ATL Limited (2019) तंजानिया में उच्च-गुणवत्ता वाले एल्युमिनियम ट्रेलरों का एकमात्र निर्माता है। हम पूर्वी व मध्य अफ्रीका के लिए टिकाऊ ईंधन परिवहन समाधान बनाते हैं।',
    ar: 'ATL Limited (تأسست 2019) هي المصنّع الوحيد لمقطورات الألومنيوم عالية الجودة في تنزانيا. نتخصص في حلول نقل وقود مبتكرة ومتينة لشرق ووسط أفريقيا.'
  },
  'atl.s1.p2': {
    en: 'With a focus on excellence, ATL has earned a reputation as a reliable name in trailer manufacturing, delivering tankers that consistently meet and surpass customer expectations. Our strategy expands the range into premium customized trailers across the region.',
    fr: 'Axée sur l’excellence, ATL s’est forgé une réputation de fabricant fiable, livrant des citernes qui dépassent les attentes. Notre stratégie élargit la gamme aux remorques premium personnalisées dans la région.',
    sw: 'Kwa kuzingatia ubora, ATL imejipatia sifa kama jina la kuaminika katika utengenezaji wa trela, ikitoa matangi yanayokidhi na kuzidi matarajio ya wateja. Mkakati wetu unapanua aina hadi trela maalum za premium katika eneo.',
    hi: 'उत्कृष्टता पर ध्यान देकर ATL ने ट्रेलर निर्माण में विश्वसनीय नाम बनाया है। हमारी रणनीति क्षेत्र में प्रीमियम कस्टम ट्रेलरों तक विस्तार करती है।',
    ar: 'بتركيز على التميز اكتسبت ATL سمعة موثوقة في تصنيع المقطورات. توسّع استراتيجيتنا النطاق إلى مقطورات مخصصة فاخرة عبر المنطقة.'
  },
  'atl.s1.check1': { en: 'Only aluminium trailer manufacturer in Tanzania', fr: 'Seul fabricant de remorques aluminium en Tanzanie', sw: 'Mtengenezaji pekee wa trela za aluminium Tanzania', hi: 'तंजानिया में एकमात्र एल्युमिनियम ट्रेलर निर्माता', ar: 'المصنّع الوحيد لمقطورات الألومنيوم في تنزانيا' },
  'atl.s1.check2': { en: 'Fuel tankers engineered for African operating conditions', fr: 'Citernes conçues pour les conditions africaines', sw: 'Matangi ya mafuta yaliyoundwa kwa hali za Afrika', hi: 'अफ्रीकी परिचालन परिस्थितियों हेतु ईंधन टैंकर', ar: 'صهاريج وقود مصممة لظروف التشغيل الأفريقية' },
  'atl.s1.check3': { en: 'Custom builds with technical support and warranty', fr: 'Constructions sur mesure avec support technique et garantie', sw: 'Ujenzi maalum na msaada wa kiufundi na dhamana', hi: 'तकनीकी सहायता और वारंटी के साथ कस्टम बिल्ड', ar: 'تصاميم مخصصة مع دعم فني وضمان' },
  'atl.s1.check4': { en: 'Facility at Kipawa, Nyerere Road (opp. JNIA Terminal 3)', fr: 'Usine à Kipawa, route Nyerere (face Terminal 3 JNIA)', sw: 'Kituo Kipawa, Barabara ya Nyerere (karibu na JNIA Terminal 3)', hi: 'किपावा, न्येरेरे रोड सुविधा (JNIA टर्मिनल 3 के सामने)', ar: 'منشأة في كيباوا، طريق نيريري (مقابل مبنى 3 بمطار JNIA)' },
  'atl.glance.title': { en: 'At a Glance', fr: 'En un coup d’œil', sw: 'Kwa Muhtasari', hi: 'एक नज़र में', ar: 'لمحة سريعة' },
  'atl.glance.est': { en: 'Established', fr: 'Fondée', sw: 'Ilianzishwa', hi: 'स्थापना', ar: 'تأسست' },
  'atl.glance.spec': { en: 'Specialty', fr: 'Spécialité', sw: 'Utaalamu', hi: 'विशेषता', ar: 'التخصص' },
  'atl.glance.specVal': { en: 'Aluminium tankers', fr: 'Citernes aluminium', sw: 'Matangi ya aluminium', hi: 'एल्युमिनियम टैंकर', ar: 'صهاريج ألومنيوم' },
  'atl.glance.loc': { en: 'Location', fr: 'Localisation', sw: 'Mahali', hi: 'स्थान', ar: 'الموقع' },
  'atl.glance.locVal': { en: 'Dar es Salaam', fr: 'Dar es Salaam', sw: 'Dar es Salaam', hi: 'दार एस सलाम', ar: 'دار السلام' },
  'atl.glance.hours': { en: 'Hours', fr: 'Horaires', sw: 'Saa', hi: 'समय', ar: 'الساعات' },
  'atl.glance.hoursVal': { en: 'Mon-Fri 8:00-16:30', fr: 'Lun-Ven 8h00-16h30', sw: 'Jumatatu-Ijumaa 8:00-16:30', hi: 'सोम-शुक्र 8:00-16:30', ar: 'الإثنين-الجمعة 8:00-16:30' },
  'atl.glance.sat': { en: 'Saturday', fr: 'Samedi', sw: 'Jumamosi', hi: 'शनिवार', ar: 'السبت' },
  'atl.glance.satVal': { en: '8:00-12:30', fr: '8h00-12h30', sw: '8:00-12:30', hi: '8:00-12:30', ar: '8:00-12:30' },
  'atl.s2.eyebrow': { en: 'About the Company', fr: 'À propos', sw: 'Kuhusu Kampuni', hi: 'कंपनी के बारे में', ar: 'عن الشركة' },
  'atl.s2.title': { en: 'Mission, Vision & Values', fr: 'Mission, vision et valeurs', sw: 'Dira, Maono na Maadili', hi: 'मिशन, विज़न और मूल्य', ar: 'المهمة والرؤية والقيم' },
  'atl.s2.mission': { en: 'Mission', fr: 'Mission', sw: 'Dira', hi: 'मिशन', ar: 'المهمة' },
  'atl.s2.mission.body': {
    en: 'To design and manufacture the highest quality trailers by fostering a culture of integrity, excellence, and continuous improvement.',
    fr: 'Concevoir et fabriquer des remorques de la plus haute qualité en cultivant l’intégrité, l’excellence et l’amélioration continue.',
    sw: 'Kubuni na kutengeneza trela za ubora wa juu zaidi kwa kukuza utamaduni wa uadilifu, ubora, na uboreshaji endelevu.',
    hi: 'ईमानदारी, उत्कृष्टता और निरंतर सुधार की संस्कृति से उच्चतम गुणवत्ता के ट्रेलर डिज़ाइन व निर्माण करना।',
    ar: 'تصميم وتصنيع أعلى جودة من المقطورات بتعزيز ثقافة النزاهة والتميز والتحسين المستمر.'
  },
  'atl.s2.vision': { en: 'Vision', fr: 'Vision', sw: 'Maono', hi: 'विज़न', ar: 'الرؤية' },
  'atl.s2.vision.body': {
    en: 'To become the leading trailer manufacturer in East and Central Africa, providing sustainable solutions focused on safety, innovation and customization.',
    fr: 'Devenir le fabricant de remorques leader en Afrique de l’Est et Centrale, avec des solutions durables axées sur la sécurité, l’innovation et la personnalisation.',
    sw: 'Kuwa mtengenezaji wa trela anayeongoza Afrika Mashariki na Kati, tukitoa suluhisho endelevu zinazolenga usalama, ubunifu na ubinafsishaji.',
    hi: 'पूर्वी व मध्य अफ्रीका में अग्रणी ट्रेलर निर्माता बनना — सुरक्षा, नवाचार और कस्टमाइज़ेशन पर केंद्रित।',
    ar: 'أن نصبح الشركة الرائدة في تصنيع المقطورات بشرق ووسط أفريقيا بحلول مستدامة تركز على السلامة والابتكار والتخصيص.'
  },
  'atl.val.integrity': { en: 'Integrity', fr: 'Intégrité', sw: 'Uadilifu', hi: 'ईमानदारी', ar: 'النزاهة' },
  'atl.val.integrity.d': {
    en: 'Honesty, transparency and accountability. We deliver on promises and maintain a strong moral compass.',
    fr: 'Honnêteté, transparence et responsabilité. Nous tenons nos promesses et gardons une boussole morale solide.',
    sw: 'Uaminifu, uwazi na uwajibikaji. Tunatimiza ahadi na kudumisha dira thabiti ya maadili.',
    hi: 'ईमानदारी, पारदर्शिता और जवाबदेही। हम वादे पूरे करते हैं।',
    ar: 'الصدق والشفافية والمساءلة. نفي بالوعود ونحافظ على بوصلة أخلاقية قوية.'
  },
  'atl.val.people': { en: 'People', fr: 'Personnes', sw: 'Watu', hi: 'लोग', ar: 'الأشخاص' },
  'atl.val.people.d': {
    en: 'Employees are our greatest asset - safety, inclusion, professional development and a positive culture.',
    fr: 'Les employés sont notre plus grand atout - sécurité, inclusion, développement professionnel et culture positive.',
    sw: 'Wafanyakazi ndio rasilimali yetu kubwa - usalama, ujumuishaji, maendeleo ya kitaalamu na utamaduni chanya.',
    hi: 'कर्मचारी हमारी सबसे बड़ी संपत्ति — सुरक्षा, समावेश, व्यावसायिक विकास।',
    ar: 'الموظفون أعظم أصولنا — السلامة والشمول والتطوير المهني وثقافة إيجابية.'
  },
  'atl.val.sust': { en: 'Sustainability', fr: 'Durabilité', sw: 'Uendelevu', hi: 'स्थिरता', ar: 'الاستدامة' },
  'atl.val.sust.d': {
    en: 'Lower impact materials and processes; products that support greener transport requirements.',
    fr: 'Matériaux et procédés à moindre impact ; produits alignés sur des exigences de transport plus vertes.',
    sw: 'Vifaa na michakato ya athari ndogo; bidhaa zinazounga mkono mahitaji ya usafiri wa kijani.',
    hi: 'कम प्रभाव वाली सामग्री और प्रक्रियाएँ; हरित परिवहन आवश्यकताओं का समर्थन।',
    ar: 'مواد وعمليات أقل أثراً؛ منتجات تدعم متطلبات النقل الأخضر.'
  },
  'atl.val.cust': { en: 'Customers', fr: 'Clients', sw: 'Wateja', hi: 'ग्राहक', ar: 'العملاء' },
  'atl.val.cust.d': {
    en: 'Long-term partners built on trust, value, quality and reliability - not one-off sales.',
    fr: 'Partenaires de long terme fondés sur la confiance, la valeur, la qualité et la fiabilité.',
    sw: 'Washirika wa muda mrefu walioundwa kwa uaminifu, thamani, ubora na kutegemewa - si mauzo ya mara moja.',
    hi: 'विश्वास, मूल्य, गुणवत्ता और विश्वसनीयता पर दीर्घकालिक साझेदार — एकमुश्त बिक्री नहीं।',
    ar: 'شركاء طويلو الأمد على أساس الثقة والقيمة والجودة والموثوقية — لا مبيعات لمرة واحدة.'
  },
  'atl.s3.eyebrow': { en: 'Brand Promise', fr: 'Promesse de marque', sw: 'Ahadi ya Chapa', hi: 'ब्रांड वादा', ar: 'وعد العلامة' },
  'atl.s3.title': { en: 'Savings · Safety · Solutions', fr: 'Économies · Sécurité · Solutions', sw: 'Akiba · Usalama · Suluhisho', hi: 'बचत · सुरक्षा · समाधान', ar: 'توفير · سلامة · حلول' },
  'atl.s3.savings': { en: 'Savings', fr: 'Économies', sw: 'Akiba', hi: 'बचत', ar: 'توفير' },
  'atl.s3.savings.1': { en: 'Light trailers', fr: 'Remorques légères', sw: 'Trela nyepesi', hi: 'हल्के ट्रेलर', ar: 'مقطورات خفيفة' },
  'atl.s3.savings.2': { en: 'More payload', fr: 'Plus de charge utile', sw: 'Mzigo zaidi', hi: 'अधिक पेलोड', ar: 'حمولة أكبر' },
  'atl.s3.savings.3': { en: 'Increased fuel efficiency', fr: 'Meilleure efficacité carburant', sw: 'Ufanisi mkubwa wa mafuta', hi: 'बेहतर ईंधन दक्षता', ar: 'كفاءة وقود أعلى' },
  'atl.s3.savings.4': { en: 'Long-term savings on maintenance and repairs', fr: 'Économies long terme sur entretien et réparations', sw: 'Akiba ya muda mrefu kwenye matengenezo', hi: 'रखरखाव पर दीर्घकालिक बचत', ar: 'توفير طويل الأمد في الصيانة والإصلاح' },
  'atl.s3.safety': { en: 'Safety', fr: 'Sécurité', sw: 'Usalama', hi: 'सुरक्षा', ar: 'السلامة' },
  'atl.s3.safety.1': { en: 'Air suspension for tankers', fr: 'Suspension pneumatique pour citernes', sw: 'Suspension ya hewa kwa matangi', hi: 'टैंकरों के लिए एयर सस्पेंशन', ar: 'تعليق هوائي للصهاريج' },
  'atl.s3.safety.2': { en: 'Reliable braking systems', fr: 'Systèmes de freinage fiables', sw: 'Mifumo ya breki inayotegemewa', hi: 'विश्वसनीय ब्रेकिंग सिस्टम', ar: 'أنظمة كبح موثوقة' },
  'atl.s3.safety.3': { en: 'Strategic flooding points', fr: 'Points d’inondation stratégiques', sw: 'Pointi za mafuriko za kimkakati', hi: 'रणनीतिक फ्लडिंग पॉइंट', ar: 'نقاط غمر استراتيجية' },
  'atl.s3.safety.4': { en: 'Secure coupling systems', fr: 'Systèmes d’attelage sécurisés', sw: 'Mifumo salama ya kuunganisha', hi: 'सुरक्षित कपलिंग सिस्टम', ar: 'أنظمة اقتران آمنة' },
  'atl.s3.safety.5': { en: 'High-visibility reflectors', fr: 'Réflecteurs haute visibilité', sw: 'Vifaa vya kuakisi vinavyoonekana vizuri', hi: 'उच्च दृश्यता रिफ्लेक्टर', ar: 'عاكسات عالية الوضوح' },
  'atl.s3.solutions': { en: 'Solutions', fr: 'Solutions', sw: 'Suluhisho', hi: 'समाधान', ar: 'حلول' },
  'atl.s3.solutions.1': { en: 'Customized tailor designs', fr: 'Conceptions sur mesure', sw: 'Miundo maalum iliyobinafsishwa', hi: 'कस्टम डिज़ाइन', ar: 'تصاميم مخصصة' },
  'atl.s3.solutions.2': { en: 'Technical support', fr: 'Support technique', sw: 'Msaada wa kiufundi', hi: 'तकनीकी सहायता', ar: 'دعم فني' },
  'atl.s3.solutions.3': { en: 'Warranty and maintenance', fr: 'Garantie et maintenance', sw: 'Dhamana na matengenezo', hi: 'वारंटी और रखरखाव', ar: 'ضمان وصيانة' },
  'atl.s3.solutions.4': { en: 'Personalized service', fr: 'Service personnalisé', sw: 'Huduma iliyobinafsishwa', hi: 'व्यक्तिगत सेवा', ar: 'خدمة مخصصة' },
  'atl.s3.solutions.5': { en: 'Cost-effectiveness', fr: 'Rentabilité', sw: 'Ufanisi wa gharama', hi: 'लागत-प्रभावशीलता', ar: 'فعالية التكلفة' },
  'atl.s4.eyebrow': { en: 'Why Aluminium', fr: 'Pourquoi l’aluminium', sw: 'Kwa Nini Aluminium', hi: 'एल्युमिनियम क्यों', ar: 'لماذا الألومنيوم' },
  'atl.s4.title': { en: 'Material Advantages', fr: 'Avantages matériau', sw: 'Faida za Nyenzo', hi: 'सामग्री लाभ', ar: 'مزايا المادة' },
  'atl.s4.non.title': { en: 'Non-Reactive', fr: 'Non réactif', sw: 'Haitendi', hi: 'अреакशील', ar: 'غير تفاعلي' },
  'atl.s4.non.body': {
    en: 'Aluminum is non-reactive with most fuels, helping prevent contamination - especially important for sensitive fuels including aviation fuel.',
    fr: 'L’aluminium est non réactif avec la plupart des carburants, limitant la contamination - crucial pour les carburants sensibles dont l’aviation.',
    sw: 'Aluminium haitendi na mafuta mengi, ikisaidia kuzuia uchafuzi - muhimu sana kwa mafuta nyeti ikiwa ni pamoja na mafuta ya ndege.',
    hi: 'एल्युमिनियम अधिकांश ईंधनों के साथ अक्रियाशील है — विमानन ईंधन सहित संवेदनशील ईंधनों के लिए महत्वपूर्ण।',
    ar: 'الألومنيوم غير تفاعلي مع معظم أنواع الوقود مما يمنع التلوث — مهم خصوصاً لوقود الطيران.'
  },
  'atl.s4.corr.title': { en: 'Corrosion Resistant', fr: 'Résistant à la corrosion', sw: 'Inakabili Kutu', hi: 'जंग प्रतिरोधी', ar: 'مقاوم للتآكل' },
  'atl.s4.corr.body': {
    en: 'Naturally resists rust in harsh weather and moisture, reducing maintenance and prolonging tanker life.',
    fr: 'Résiste naturellement à la rouille par mauvais temps et humidité, réduisant l’entretien et prolongeant la durée de vie.',
    sw: 'Asilia inakataa kutu katika hali mbaya ya hewa na unyevu, ikipunguza matengenezo na kurefusha maisha ya tanki.',
    hi: 'कठोर मौसम और नमी में स्वाभाविक रूप से जंग से बचाव — रखरखाव कम, आयु अधिक।',
    ar: 'يقاوم الصدأ طبيعياً في الطقس القاسي والرطوبة فيقلل الصيانة ويطيل عمر الصهريج.'
  },
  'atl.s4.fuel.title': { en: 'Fuel Efficiency', fr: 'Efficacité carburant', sw: 'Ufanisi wa Mafuta', hi: 'ईंधन दक्षता', ar: 'كفاءة الوقود' },
  'atl.s4.fuel.body': {
    en: 'Lower tare weight means more legal payload and less energy to haul the tanker.',
    fr: 'Un poids à vide plus faible signifie plus de charge utile légale et moins d’énergie pour tracter.',
    sw: 'Uzito mdogo wa tupu unamaanisha mzigo zaidi wa kisheria na nishati ndogo ya kuvuta tanki.',
    hi: 'कम खाली वजन = अधिक कानूनी पेलोड और कम ऊर्जा।',
    ar: 'وزن فارغ أقل يعني حمولة قانونية أكبر وطاقة أقل لسحب الصهريج.'
  },
  'atl.s4.str.title': { en: 'Strength & Safety', fr: 'Résistance et sécurité', sw: 'Nguvu na Usalama', hi: 'मज़बूती और सुरक्षा', ar: 'القوة والسلامة' },
  'atl.s4.str.body': {
    en: 'High strength-to-weight ratio for transport stresses, with impact absorption that supports operational safety.',
    fr: 'Excellent rapport résistance/poids pour les contraintes du transport, avec absorption des chocs pour la sécurité.',
    sw: 'Uwiano wa juu wa nguvu kwa uzito kwa mikazo ya usafiri, na ufyonzaji wa athari unaounga mkono usalama wa uendeshaji.',
    hi: 'परिवहन तनाव हेतु उच्च शक्ति-से-भार अनुपात, प्रभाव अवशोषण से परिचालन सुरक्षा।',
    ar: 'نسبة قوة إلى وزن عالية لإجهادات النقل مع امتصاص صدمات يدعم السلامة التشغيلية.'
  },
  'atl.s4.env.title': { en: 'Environment', fr: 'Environnement', sw: 'Mazingira', hi: 'पर्यावरण', ar: 'البيئة' },
  'atl.s4.env.body': {
    en: 'Highly recyclable aluminium with lower recycling energy versus primary production - aligned with strict fuel-transport standards.',
    fr: 'Aluminium hautement recyclable avec une énergie de recyclage inférieure à la production primaire - aligné sur des normes strictes de transport de carburant.',
    sw: 'Aluminium inayoweza kusindikawa tena kwa nishati ya chini kuliko uzalishaji wa awali - inalingana na viwango kali vya usafirishaji wa mafuta.',
    hi: 'अत्यधिक पुनर्चक्रण योग्य एल्युमिनियम — प्राथमिक उत्पादन की तुलना में कम ऊर्जा, कड़े ईंधन-परिवहन मानकों के अनुरूप।',
    ar: 'ألومنيوم قابل لإعادة التدوير بطاقة أقل من الإنتاج الأولي — متوافق مع معايير نقل الوقود الصارمة.'
  },
  'atl.s4.custom.title': { en: 'Custom Range', fr: 'Gamme sur mesure', sw: 'Aina Maalum', hi: 'कस्टम रेंज', ar: 'نطاق مخصص' },
  'atl.s4.custom.body': {
    en: 'Expanding beyond fuel tankers into premium customized trailers for regional logistics needs.',
    fr: 'Extension au-delà des citernes vers des remorques premium personnalisées pour la logistique régionale.',
    sw: 'Tunapanua zaidi ya matangi ya mafuta hadi trela maalum za premium kwa mahitaji ya usafirishaji wa kikanda.',
    hi: 'ईंधन टैंकरों से आगे क्षेत्रीय लॉजिस्टिक्स हेतु प्रीमियम कस्टम ट्रेलर।',
    ar: 'التوسع أبعد من صهاريج الوقود إلى مقطورات مخصصة فاخرة لاحتياجات اللوجستيات الإقليمية.'
  },
  'atl.s5.eyebrow': { en: 'Products', fr: 'Produits', sw: 'Bidhaa', hi: 'उत्पाद', ar: 'المنتجات' },
  'atl.s5.title': { en: 'Tankers & Custom Trailers for Africa', fr: 'Citernes et remorques sur mesure pour l’Afrique', sw: 'Matangi na Trela Maalum kwa Afrika', hi: 'अफ्रीका के लिए टैंकर और कस्टम ट्रेलर', ar: 'صهاريج ومقطورات مخصصة لأفريقيا' },
  'atl.s5.lede': {
    en: 'Discover our range of high-quality aluminum fuel tankers designed for safety, durability, and efficiency. Each model is built to meet industry standards and tailored to your specific needs.',
    fr: 'Découvrez notre gamme de citernes aluminium haute qualité conçues pour la sécurité, la durabilité et l’efficacité. Chaque modèle répond aux normes et à vos besoins.',
    sw: 'Gundua aina yetu ya matangi ya mafuta ya aluminium ya ubora wa juu yaliyoundwa kwa usalama, uimara na ufanisi. Kila mfano unakidhi viwango vya tasnia na mahitaji yako.',
    hi: 'सुरक्षा, टिकाऊपन और दक्षता हेतु उच्च-गुणवत्ता वाले एल्युमिनियम ईंधन टैंकरों की हमारी रेंज देखें।',
    ar: 'اكتشف مجموعتنا من صهاريج الوقود الألومنيوم عالية الجودة المصممة للسلامة والمتانة والكفاءة.'
  },
  'atl.s5.tankers.title': { en: 'Aluminium Fuel Tankers', fr: 'Citernes aluminium', sw: 'Matangi ya Mafuta ya Aluminium', hi: 'एल्युमिनियम ईंधن टैंकर', ar: 'صهاريج وقود ألومنيوم' },
  'atl.s5.tankers.body': {
    en: 'High-quality aluminum fuel tankers designed for safety, durability and efficiency on African routes.',
    fr: 'Citernes aluminium haute qualité pour la sécurité, la durabilité et l’efficacité sur les routes africaines.',
    sw: 'Matangi ya mafuta ya aluminium ya ubora wa juu yaliyoundwa kwa usalama, uimara na ufanisi kwenye barabara za Afrika.',
    hi: 'अफ्रीकी मार्गों पर सुरक्षा, टिकाऊपन और दक्षता हेतु उच्च-गुणवत्ता वाले एल्युमिनियम ईंधन टैंकर।',
    ar: 'صهاريج وقود ألومنيوم عالية الجودة للسلامة والمتانة والكفاءة على الطرق الأفريقية.'
  },
  'atl.s5.custom.title': { en: 'Custom Trailers', fr: 'Remorques sur mesure', sw: 'Trela Maalum', hi: 'कस्टम ट्रेलर', ar: 'مقطورات مخصصة' },
  'atl.s5.custom.body': {
    en: 'Tailored trailer configurations to match payload, coupling and operating requirements.',
    fr: 'Configurations de remorques adaptées à la charge, l’attelage et les exigences d’exploitation.',
    sw: 'Miundo ya trela iliyobinafsishwa kulingana na mzigo, kuunganisha na mahitaji ya uendeshaji.',
    hi: 'पेलोड, कपलिंग और परिचालन आवश्यकताओं के अनुरूप ट्रेलर कॉन्फ़िगरेशन।',
    ar: 'تكوينات مقطورات مخصصة لتلائم الحمولة والاقتران ومتطلبات التشغيل.'
  },
  'atl.s5.support.title': { en: 'Support & Warranty', fr: 'Support et garantie', sw: 'Msaada na Dhamana', hi: 'सहायता और वारंटी', ar: 'الدعم والضمان' },
  'atl.s5.support.body': {
    en: 'Technical support, warranty coverage and maintenance partnership after delivery.',
    fr: 'Support technique, garantie et partenariat de maintenance après livraison.',
    sw: 'Msaada wa kiufundi, dhamana na ushirikiano wa matengenezo baada ya uwasilishaji.',
    hi: 'डिलीवरी के बाद तकनीकी सहायता, वारंटी और रखरखाव साझेदारी।',
    ar: 'دعم فني وتغطية ضمان وشراكة صيانة بعد التسليم.'
  },
  'atl.s6.eyebrow': { en: 'Testimonials', fr: 'Témoignages', sw: 'Ushuhuda', hi: 'प्रशंसापत्र', ar: 'شهادات' },
  'atl.s6.title': { en: 'What Clients Say', fr: 'Ce que disent les clients', sw: 'Wateja Wanasema Nini', hi: 'ग्राहक क्या कहते हैं', ar: 'ماذا يقول العملاء' },
  'atl.s6.lede': {
    en: 'At ATL, we pride ourselves on trailers that deliver unmatched performance, durability, and value. Hear from the people who rely on our aluminum trailers every day.',
    fr: 'Chez ATL, nos remorques offrent performance, durabilité et valeur inégalées. Écoutez ceux qui comptent sur nos remorques aluminium chaque jour.',
    sw: 'Katika ATL, tunajivunia trela zinazotoa utendaji, uimara na thamani isiyo na kifani. Sikiliza kutoka kwa watu wanaotegemea trela zetu za aluminium kila siku.',
    hi: 'ATL में हम अद्वितीय प्रदर्शन, टिकाऊपन और मूल्य वाले ट्रेलरों पर गर्व करते हैं।',
    ar: 'في ATL نفخر بمقطورات تقدم أداءً ومتانة وقيمة لا مثيل لها. استمع لمن يعتمدون على مقطوراتنا يومياً.'
  },
  'atl.s6.q1': {
    en: '"Thank you, Aluminum Trailers Limited. Looking forward for more transformation of our trailers with you. As you won\'t find a better customer servicing of high quality manufacturing anywhere else in East Africa, it just allows us to rely on you comfortably."',
    fr: '« Merci, Aluminum Trailers Limited. Au plaisir de poursuivre la transformation de nos remorques avec vous. On ne trouve pas un meilleur service client de fabrication haute qualité ailleurs en Afrique de l’Est. »',
    sw: '"Asante, Aluminum Trailers Limited. Tunatazamia mabadiliko zaidi ya trela zetu pamoja nanyi. Hautapata huduma bora zaidi ya wateja ya utengenezaji wa ubora wa juu popote Afrika Mashariki."',
    hi: '"धन्यवाद, Aluminum Trailers Limited। पूर्वी अफ्रीका में उच्च गुणवत्ता निर्माण की बेहतर ग्राहक सेवा नहीं मिलती — हम आप पर सहज भरोसा कर सकते हैं।"',
    ar: '"شكراً Aluminum Trailers Limited. نتطلع لمزيد من تطوير مقطوراتنا معكم. لن تجدوا خدمة عملاء أفضل لتصنيع عالي الجودة في شرق أفريقيا."'
  },
  'atl.s6.q1.by': { en: 'MOIL Company CEO', fr: 'PDG, MOIL Company', sw: 'Mkurugenzi Mkuu, MOIL Company', hi: 'MOIL कंपनी सीईओ', ar: 'الرئيس التنفيذي لشركة MOIL' },
  'atl.s6.q2': {
    en: '"From fabrication to manufacturing quality - the effective best manufacturing tanker company I have dealt with. Higher volumes loaded, many trips in a short time. The overall merits of the trailer are amazing."',
    fr: '« De la fabrication à la qualité - la meilleure société de citernes avec laquelle j’ai travaillé. Volumes plus élevés, nombreux trajets. Les mérites globaux de la remorque sont remarquables. »',
    sw: '"Kutoka utengenezaji hadi ubora - kampuni bora zaidi ya matangi niliyoshughulika nayo. Mizigo mikubwa zaidi, safari nyingi kwa muda mfupi. Faida za trela ni za kushangaza."',
    hi: '"निर्माण से गुणवत्ता तक — सबसे प्रभावी टैंकर निर्माता। अधिक मात्रा, कम समय में अधिक यात्राएँ। ट्रेलर के गुण अद्भुत हैं।"',
    ar: '"من التصنيع إلى الجودة — أفضل شركة صهاريج تعاملت معها. أحجام أعلى ورحلات كثيرة في وقت قصير. مزايا المقطورة مذهلة."'
  },
  'atl.s6.q2.by': { en: 'Orange Gas Co. Ltd CEO', fr: 'PDG, Orange Gas Co. Ltd', sw: 'Mkurugenzi Mkuu, Orange Gas Co. Ltd', hi: 'Orange Gas Co. Ltd सीईओ', ar: 'الرئيس التنفيذي لـ Orange Gas Co. Ltd' },
  'atl.s7.eyebrow': { en: 'Partners', fr: 'Partenaires', sw: 'Washirika', hi: 'साझेदार', ar: 'الشركاء' },
  'atl.s7.title': { en: 'Financial Partners', fr: 'Partenaires financiers', sw: 'Washirika wa Kifedha', hi: 'वित्तीय साझेदार', ar: 'شركاء ماليون' },
  'atl.s7.lede': {
    en: 'ATL works with leading regional financial and commercial partners supporting fleet and manufacturing growth.',
    fr: 'ATL collabore avec des partenaires financiers et commerciaux régionaux de premier plan pour la flotte et la fabrication.',
    sw: 'ATL inafanya kazi na washirika wakuu wa kifedha na kibiashara wa kikanda wanaounga mkono ukuaji wa meli na utengenezaji.',
    hi: 'ATL बेड़े और विनिर्माण विकास हेतु प्रमुख क्षेत्रीय वित्तीय व वाणिज्यिक साझेदारों के साथ काम करता है।',
    ar: 'تتعاون ATL مع شركاء ماليين وتجاريين إقليميين رائدين لدعم نمو الأسطول والتصنيع.'
  },
  'atl.s8.eyebrow': { en: 'Location', fr: 'Emplacement', sw: 'Mahali', hi: 'स्थान', ar: 'الموقع' },
  'atl.s8.title': { en: 'Visit ATL', fr: 'Visiter ATL', sw: 'Tembelea ATL', hi: 'ATL पर जाएँ', ar: 'زر ATL' },
  'atl.s8.name': { en: 'ATL Limited', fr: 'ATL Limited', sw: 'ATL Limited', hi: 'ATL Limited', ar: 'ATL Limited' },
  'atl.s8.address': { en: 'Address', fr: 'Adresse', sw: 'Anwani', hi: 'पता', ar: 'العنوان' },
  'atl.s8.address.line': { en: 'Kipawa, Nyerere Road', fr: 'Kipawa, route Nyerere', sw: 'Kipawa, Barabara ya Nyerere', hi: 'किपावा, न्येरेरे रोड', ar: 'كيباوا، طريق نيريري' },
  'atl.s8.address.dim': { en: 'Opposite Julius Nyerere Airport Terminal 3, Dar es Salaam', fr: 'En face du Terminal 3 de l’aéroport Julius Nyerere, Dar es Salaam', sw: 'Mbele ya Julius Nyerere Airport Terminal 3, Dar es Salaam', hi: 'जूलियस न्येरेरे एयरपोर्ट टर्मिनल 3 के सामने, दार एस सलाम', ar: 'مقابل مبنى 3 بمطار جوليوس نيريري، دار السلام' },
  'atl.s8.hours': { en: 'Work Hours', fr: 'Horaires', sw: 'Saa za Kazi', hi: 'कार्य समय', ar: 'ساعات العمل' },
  'atl.s8.hours.line': { en: 'Mon-Fri 8:00am - 16:30pm', fr: 'Lun-Ven 8h00 - 16h30', sw: 'Jumatatu-Ijumaa 8:00am - 16:30pm', hi: 'सोम-शुक्र 8:00am - 16:30pm', ar: 'الإثنين-الجمعة 8:00ص - 4:30م' },
  'atl.s8.hours.dim': { en: 'Sat 8:00am - 12:30pm', fr: 'Sam 8h00 - 12h30', sw: 'Jumamosi 8:00am - 12:30pm', hi: 'शनि 8:00am - 12:30pm', ar: 'السبت 8:00ص - 12:30م' },
  'atl.s8.web': { en: 'Website', fr: 'Site web', sw: 'Tovuti', hi: 'वेबसाइट', ar: 'الموقع' },
  'atl.s8.web.dim': { en: 'Content mirrored on this Lake Group page', fr: 'Contenu repris sur cette page Lake Group', sw: 'Maudhui yameakisiwa kwenye ukurasa huu wa Lake Group', hi: 'सामग्री इस लेक ग्रुप पृष्ठ पर प्रतिबिंबित', ar: 'المحتوى معكوس على صفحة مجموعة ليك هذه' }
};

function mergeKeys(content) {
  let n = 0;
  for (const [key, vals] of Object.entries(KEYS)) {
    for (const lang of ['en', 'fr', 'sw', 'hi', 'ar']) {
      if (!content[lang]) content[lang] = {};
      content[lang][key] = vals[lang] || vals.en;
      n++;
    }
  }
  return n / 5;
}

function wireAgro(html) {
  return html
    .replace(
      /<nav class="breadcrumb"><a href="index\.html" data-i18n="nav\.home">Home<\/a><span>\/<\/span><span>Agro Processing<\/span><span>\/<\/span><span>Lake Agro<\/span><\/nav>\s*<div class="eyebrow">Lake Agro · Dar es Salaam<\/div>\s*<h1>Lake Agro<\/h1>\s*<p>Creating customers and food for life through plantations, integrated Ag Parks and agribusiness processing across Africa\.<\/p>/,
      `<nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span data-i18n="agro.crumb.cat">Agro Processing</span><span>/</span><span data-i18n="agro.crumb.name">Lake Agro</span></nav>
    <div class="eyebrow" data-i18n="agro.hero.eyebrow">Lake Agro · Dar es Salaam</div>
    <h1 data-i18n="agro.hero.title">Lake Agro</h1>
    <p data-i18n="agro.hero.lede">Creating customers and food for life through plantations, integrated Ag Parks and agribusiness processing across Africa.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">Why We Are<\/span><\/div>\s*<h2 class="fs-display">Food Systems for Africa<\/h2>\s*<hr class="fs-rule" style="margin:var\(--sp-5\) 0">\s*<p class="fs-lede">Private business communities partnering with governments, development financial institutions \(DFIs\) and initiatives like the Africa Savannahs Initiative to assist Africa to feed itself and create jobs for youth and women\.<\/p>\s*<p style="margin-top:14px">At least 233 million people were estimated to be hungry or undernourished in sub-Saharan Africa \(UN FAO, 2014\)\. Africa's food challenge is compounded by a population expected to double to 2\.4 billion by 2050\.<\/p>\s*<p style="margin-top:14px">Africa's Agriculture Status Report 2017 \(Alliance for a Green Revolution in Africa\) notes the continent's food market is growing rapidly, with opportunities estimated at more than <strong>\$1 trillion every year by 2030<\/strong>, helping substitute food imports with high-value food made in Africa\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="agro.s1.eyebrow">Why We Are</span></div>
        <h2 class="fs-display" data-i18n="agro.s1.title">Food Systems for Africa</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede" data-i18n="agro.s1.lede">Private business communities partnering with governments, development financial institutions (DFIs) and initiatives like the Africa Savannahs Initiative to assist Africa to feed itself and create jobs for youth and women.</p>
        <p style="margin-top:14px" data-i18n="agro.s1.p2">At least 233 million people were estimated to be hungry or undernourished in sub-Saharan Africa (UN FAO, 2014). Africa's food challenge is compounded by a population expected to double to 2.4 billion by 2050.</p>
        <p style="margin-top:14px" data-i18n="agro.s1.p3" data-i18n-html>Africa's Agriculture Status Report 2017 (Alliance for a Green Revolution in Africa) notes the continent's food market is growing rapidly, with opportunities estimated at more than <strong>$1 trillion every year by 2030</strong>, helping substitute food imports with high-value food made in Africa.</p>`
    )
    .replace(/<h3>At a Glance<\/h3>/, '<h3 data-i18n="agro.glance.title">At a Glance</h3>')
    .replace(
      /<div class="info-row"><span>HQ city<\/span><span class="badge badge-yellow">Dar es Salaam<\/span><\/div>\s*<div class="info-row"><span>Email<\/span><span class="badge badge-yellow">info@lakeagro\.com<\/span><\/div>\s*<div class="info-row"><span>Phone<\/span><span class="badge badge-yellow">\+255 222 780 510<\/span><\/div>\s*<div class="info-row"><span>Tagline<\/span><span class="badge badge-yellow">Food for life<\/span><\/div>/,
      `<div class="info-row"><span data-i18n="agro.glance.hq">HQ city</span><span class="badge badge-yellow">Dar es Salaam</span></div>
            <div class="info-row"><span data-i18n="agro.glance.email">Email</span><span class="badge badge-yellow">info@lakeagro.com</span></div>
            <div class="info-row"><span data-i18n="agro.glance.phone">Phone</span><span class="badge badge-yellow">+255 222 780 510</span></div>
            <div class="info-row"><span data-i18n="agro.glance.tagline">Tagline</span><span class="badge badge-yellow" data-i18n="agro.glance.taglineVal">Food for life</span></div>`
    )
    .replace(
      /<span class="fs-eyebrow">What We Are<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Secure · Establish · Consolidate<\/h2>\s*<p class="fs-lede" style="max-width:70ch;margin-bottom:var\(--sp-8\)">We secure, establish and consolidate farm platforms via greenfield projects or existing farm acquisitions in selected markets within our network of countries where economies of scale can be achieved\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="agro.s2.eyebrow">What We Are</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s2.title">Secure · Establish · Consolidate</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-8)" data-i18n="agro.s2.lede">We secure, establish and consolidate farm platforms via greenfield projects or existing farm acquisitions in selected markets within our network of countries where economies of scale can be achieved.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Land Availability<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">Underutilized, cost-effective land with mineralized, diversified soils along water basins and catchments whose mass exceeds farmed land to ensure water perennity over 20 years\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.land.title">Land Availability</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.land.body">Underutilized, cost-effective land with mineralized, diversified soils along water basins and catchments whose mass exceeds farmed land to ensure water perennity over 20 years.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Accessibility<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">Countries connected by rail and established transport corridors for accessible set-up or distribution of final produce within country or for export\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.access.title">Accessibility</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.access.body">Countries connected by rail and established transport corridors for accessible set-up or distribution of final produce within country or for export.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Proximity<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">Multiple continental export hubs across the network region, including major South East and Asia-facing ports and Atlantic hub access in Namibia\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.prox.title">Proximity</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.prox.body">Multiple continental export hubs across the network region, including major South East and Asia-facing ports and Atlantic hub access in Namibia.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Technical Know-How<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">Established technical capability in-country for ag technology transfer and adequate management of farms and Integrated Ag Parks\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.tech.title">Technical Know-How</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.tech.body">Established technical capability in-country for ag technology transfer and adequate management of farms and Integrated Ag Parks.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Capital Availability<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">International funding, local ag funding, specialist or development banks, and African institutional funding to bridge food-security needs\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.capital.title">Capital Availability</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.capital.body">International funding, local ag funding, specialist or development banks, and African institutional funding to bridge food-security needs.</p>`
    )
    .replace(
      /<h4 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Group Backing<\/h4><p style="font-size:\.86rem;margin-top:6px;color:var\(--ink-mute\)">Central Lake Group functions \(IT, legal, audit, finance, treasury, HR\) support Lake Agro operations and growth plans\.<\/p>/,
      `<h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.card.group.title">Group Backing</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)" data-i18n="agro.card.group.body">Central Lake Group functions (IT, legal, audit, finance, treasury, HR) support Lake Agro operations and growth plans.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">How We Are<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">3P Strategy - Prep · Plan · Process<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="agro.s3.eyebrow">How We Are</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s3.title">3P Strategy - Prep · Plan · Process</h2>`
    )
    .replace(
      /<div class="fs-card" style="padding:var\(--sp-6\)"><h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Prep<\/h4><p style="font-size:\.86rem;margin-top:6px">Deploy Phase 1 growth; rapid turnaround of underperforming Phase 2 acquisitions; lift yields and land development on greenfield plantation farms\.<\/p><\/div>\s*<div class="fs-card" style="padding:var\(--sp-6\)"><h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Plan<\/h4><p style="font-size:\.86rem;margin-top:6px">Add Integrated Ag Parks in Phase 1 for consolidation and value addition; select and acquire Phase 2 market-entry farms\.<\/p><\/div>\s*<div class="fs-card" style="padding:var\(--sp-6\)"><h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Process<\/h4><p style="font-size:\.86rem;margin-top:6px">Stand up processing as Phase 1 farms stabilize; reorganize value-addition facilities to accommodate Integrated Ag Parks in Phase 2\.<\/p><\/div>/,
      `<div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s3.prep.title">Prep</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="agro.s3.prep.body">Deploy Phase 1 growth; rapid turnaround of underperforming Phase 2 acquisitions; lift yields and land development on greenfield plantation farms.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s3.plan.title">Plan</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="agro.s3.plan.body">Add Integrated Ag Parks in Phase 1 for consolidation and value addition; select and acquire Phase 2 market-entry farms.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s3.process.title">Process</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="agro.s3.process.body">Stand up processing as Phase 1 farms stabilize; reorganize value-addition facilities to accommodate Integrated Ag Parks in Phase 2.</p></div>`
    )
    .replace(
      /<p style="margin-top:var\(--sp-8\);max-width:75ch;line-height:1\.7">Target average yields above <strong>11 t\/ha<\/strong> of arable land across commoditized crops including wheat, soybean, maize, rice, sunflower, sugar and protein \(beef\), with rotational diversification into teak, beans and horticulture \(fruit\) where land permits\.<\/p>/,
      `<p style="margin-top:var(--sp-8);max-width:75ch;line-height:1.7" data-i18n="agro.s3.yields" data-i18n-html>Target average yields above <strong>11 t/ha</strong> of arable land across commoditized crops including wheat, soybean, maize, rice, sunflower, sugar and protein (beef), with rotational diversification into teak, beans and horticulture (fruit) where land permits.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">Crops &amp; Outputs<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Production Focus<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="agro.s4.eyebrow">Crops &amp; Outputs</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s4.title">Production Focus</h2>`
    )
    .replace(/<h4>Grains &amp; Oilseeds<\/h4><p>Wheat, maize, rice, soybean and sunflower platforms for regional food security and processing feedstocks\.<\/p>/,
      `<h4 data-i18n="agro.s4.grains.title">Grains &amp; Oilseeds</h4><p data-i18n="agro.s4.grains.body">Wheat, maize, rice, soybean and sunflower platforms for regional food security and processing feedstocks.</p>`)
    .replace(/<h4>Sugar &amp; Cash Crops<\/h4><p>Sugar and related cash crops as core processing feedstocks within the Ag Park model\.<\/p>/,
      `<h4 data-i18n="agro.s4.sugar.title">Sugar &amp; Cash Crops</h4><p data-i18n="agro.s4.sugar.body">Sugar and related cash crops as core processing feedstocks within the Ag Park model.</p>`)
    .replace(/<h4>Protein &amp; Diversification<\/h4><p>Beef protein plus teak, beans and fruit horticulture in buffer spaces where land permits\.<\/p>/,
      `<h4 data-i18n="agro.s4.protein.title">Protein &amp; Diversification</h4><p data-i18n="agro.s4.protein.body">Beef protein plus teak, beans and fruit horticulture in buffer spaces where land permits.</p>`)
    .replace(
      /<span class="fs-eyebrow">Projects<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Plantations &amp; Ag Parks<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="agro.s5.eyebrow">Projects</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s5.title">Plantations &amp; Ag Parks</h2>`
    )
    .replace(
      /Serenje Plantation<\/h3>\s*<p style="color:var\(--ink-mute\);line-height:1\.7">Operations oversee the Serenje plantation platform with specialties in agronomy, crop harvesting, disease control, seed\/fertilizer\/input management, equipment procurement, works contracting and irrigation project oversight\.<\/p>/,
      `Serenje Plantation</h3>
        <p style="color:var(--ink-mute);line-height:1.7" data-i18n="agro.s5.serenje.body">Operations oversee the Serenje plantation platform with specialties in agronomy, crop harvesting, disease control, seed/fertilizer/input management, equipment procurement, works contracting and irrigation project oversight.</p>`
    )
    .replace(
      /h3 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.25rem;letter-spacing:\.03em;text-transform:uppercase;margin-bottom:12px">Serenje Plantation/,
      `h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.25rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:12px" data-i18n="agro.s5.serenje.title">Serenje Plantation`
    )
    .replace(
      /h3 style="color:var\(--white\);font-family:var\(--font-display\);font-weight:400;font-size:1\.25rem;letter-spacing:\.03em;text-transform:uppercase;margin-bottom:12px">Integrated Ag Parks<\/h3>\s*<p style="color:var\(--ink-mute\);line-height:1\.7">Ag Parks consolidate produce and add value through processing\. As the first Ag Park team is constituted, capacity is expected to roughly double, supported by Rising Stars projects that attract and retain talent\.<\/p>/,
      `h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.25rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:12px" data-i18n="agro.s5.parks.title">Integrated Ag Parks</h3>
        <p style="color:var(--ink-mute);line-height:1.7" data-i18n="agro.s5.parks.body">Ag Parks consolidate produce and add value through processing. As the first Ag Park team is constituted, capacity is expected to roughly double, supported by Rising Stars projects that attract and retain talent.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">People<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Human Capital<\/h2>\s*<p style="max-width:75ch;line-height:1\.7;margin-bottom:var\(--sp-6\)">People are Lake Agro's biggest company asset\. Farming does not exist without human capital and equity\. About 60 roles oversee Serenje plantation and Tanzania regional offices, scaling as Ag Park teams form\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="agro.s6.eyebrow">People</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s6.title">Human Capital</h2>
    <p style="max-width:75ch;line-height:1.7;margin-bottom:var(--sp-6)" data-i18n="agro.s6.lede">People are Lake Agro's biggest company asset. Farming does not exist without human capital and equity. About 60 roles oversee Serenje plantation and Tanzania regional offices, scaling as Ag Park teams form.</p>`
    )
    .replace(/<div class="val-mini-tile"><h4>Agronomy<\/h4><p>Crop science, harvesting, disease control<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.agronomy">Agronomy</h4><p data-i18n="agro.s6.agronomy.d">Crop science, harvesting, disease control</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Inputs<\/h4><p>Seed, fertilizer and input management<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.inputs">Inputs</h4><p data-i18n="agro.s6.inputs.d">Seed, fertilizer and input management</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Equipment<\/h4><p>Fleet management and procurement<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.equip">Equipment</h4><p data-i18n="agro.s6.equip.d">Fleet management and procurement</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Irrigation<\/h4><p>Works, contracting and water projects<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.irrig">Irrigation</h4><p data-i18n="agro.s6.irrig.d">Works, contracting and water projects</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Finance<\/h4><p>Control, treasury and planning<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.finance">Finance</h4><p data-i18n="agro.s6.finance.d">Control, treasury and planning</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Strategy<\/h4><p>Ag project planning and leadership<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.strategy">Strategy</h4><p data-i18n="agro.s6.strategy.d">Ag project planning and leadership</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Group IT\/Legal<\/h4><p>Shared Lake Group central roles<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.it">Group IT/Legal</h4><p data-i18n="agro.s6.it.d">Shared Lake Group central roles</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Talent<\/h4><p>Rising Stars and sustainability pools<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="agro.s6.talent">Talent</h4><p data-i18n="agro.s6.talent.d">Rising Stars and sustainability pools</p></div>`)
    .replace(
      /<span class="fs-eyebrow">Commitments<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">People Support Our Business<\/h2>\s*<p class="fs-lede" style="max-width:70ch;margin-bottom:var\(--sp-8\)">Programs and pledges from Lake Agro's commitments: local content, grower support, health, training and E\/S standards\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="agro.s7.eyebrow">Commitments</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s7.title">People Support Our Business</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-8)" data-i18n="agro.s7.lede">Programs and pledges from Lake Agro's commitments: local content, grower support, health, training and E/S standards.</p>`
    )
    .replace(/Grower Programs<\/h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;<\/span>Local content and direct-to-farm contracts<\/li><li><span>&#10003;<\/span>Private-sector connection platform<\/li><li><span>&#10003;<\/span>Mechanization workshops and demos<\/li><li><span>&#10003;<\/span>AMCO structuring around growers<\/li><li><span>&#10003;<\/span>Inputs\/outputs and green-farming training<\/li><\/ul>/,
      `Grower Programs</h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;</span><span data-i18n="agro.s7.grower.1">Local content and direct-to-farm contracts</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.grower.2">Private-sector connection platform</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.grower.3">Mechanization workshops and demos</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.grower.4">AMCO structuring around growers</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.grower.5">Inputs/outputs and green-farming training</span></li></ul>`)
    .replace(
      /font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Grower Programs/,
      `font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s7.grower.title">Grower Programs`
    )
    .replace(
      /font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Health Support<\/h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;<\/span>Support health-centre facilities at plantations and Ag Parks<\/li><li><span>&#10003;<\/span>Stocked pharmacy and dispensary<\/li><li><span>&#10003;<\/span>Emergency and operating rooms<\/li><li><span>&#10003;<\/span>Medivac and air-evacuation readiness<\/li><li><span>&#10003;<\/span>Specialist snake and arachnid treatment capacity<\/li><\/ul>/,
      `font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s7.health.title">Health Support</h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;</span><span data-i18n="agro.s7.health.1">Support health-centre facilities at plantations and Ag Parks</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.health.2">Stocked pharmacy and dispensary</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.health.3">Emergency and operating rooms</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.health.4">Medivac and air-evacuation readiness</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.health.5">Specialist snake and arachnid treatment capacity</span></li></ul>`
    )
    .replace(
      /font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Agri Training<\/h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;<\/span>Vocational centres for farmers, workers and specialists<\/li><li><span>&#10003;<\/span>Mechanization and processing value-chain training<\/li><li><span>&#10003;<\/span>HSE programs in commercial farming<\/li><li><span>&#10003;<\/span>Machinery and equipment technical courses<\/li><li><span>&#10003;<\/span>Seed\/crop and environmental management certifications<\/li><\/ul>/,
      `font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="agro.s7.train.title">Agri Training</h4><ul class="fs-check" style="margin-top:8px"><li><span>&#10003;</span><span data-i18n="agro.s7.train.1">Vocational centres for farmers, workers and specialists</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.train.2">Mechanization and processing value-chain training</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.train.3">HSE programs in commercial farming</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.train.4">Machinery and equipment technical courses</span></li><li><span>&#10003;</span><span data-i18n="agro.s7.train.5">Seed/crop and environmental management certifications</span></li></ul>`
    )
    .replace(
      /Corporate Social Responsibility<\/h3>\s*<p style="font-size:\.9rem;line-height:1\.7">Lake Group considers contribution to the community a high priority\. We create local labour, train employees and improve professional know-how across operations\.<\/p>/,
      `Corporate Social Responsibility</h3>
        <p style="font-size:.9rem;line-height:1.7" data-i18n="agro.s7.csr.body">Lake Group considers contribution to the community a high priority. We create local labour, train employees and improve professional know-how across operations.</p>`
    )
    .replace(
      /font-size:1\.2rem;letter-spacing:\.03em;text-transform:uppercase;margin-bottom:10px">Corporate Social Responsibility/,
      `font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px" data-i18n="agro.s7.csr.title">Corporate Social Responsibility`
    )
    .replace(
      /Environmental &amp; Social<\/h3>\s*<p style="font-size:\.9rem;line-height:1\.7">Projects follow high E\/S standards, including IFC Performance Standards for new CAPEX\. No people are harmed, resettled or lose land or property as a result of our activities\. Dedicated teams ensure compliance on each project\.<\/p>/,
      `Environmental &amp; Social</h3>
        <p style="font-size:.9rem;line-height:1.7" data-i18n="agro.s7.es.body">Projects follow high E/S standards, including IFC Performance Standards for new CAPEX. No people are harmed, resettled or lose land or property as a result of our activities. Dedicated teams ensure compliance on each project.</p>`
    )
    .replace(
      /font-size:1\.2rem;letter-spacing:\.03em;text-transform:uppercase;margin-bottom:10px">Environmental &amp; Social/,
      `font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px" data-i18n="agro.s7.es.title">Environmental &amp; Social`
    )
    .replace(
      /<span class="fs-eyebrow">Quality Sustainability<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Ensures Sustainability<\/h2>\s*<p style="max-width:75ch;line-height:1\.7;margin-bottom:var\(--sp-4\)">All departments \(IT, legal counsel, auditing and human resources\) are streamlined to help achieve future strategies\. A talent pool of human resources allows Lake Agro to operate and maintain project sustainability financially, socially and on a production basis\.<\/p>\s*<p style="max-width:75ch;line-height:1\.7">Leadership technical know-how entrenches a deep understanding of how to plan, run and execute plantations - and how to secure or improve them over time\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="agro.s8.eyebrow">Quality Sustainability</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s8.title">Ensures Sustainability</h2>
    <p style="max-width:75ch;line-height:1.7;margin-bottom:var(--sp-4)" data-i18n="agro.s8.p1">All departments (IT, legal counsel, auditing and human resources) are streamlined to help achieve future strategies. A talent pool of human resources allows Lake Agro to operate and maintain project sustainability financially, socially and on a production basis.</p>
    <p style="max-width:75ch;line-height:1.7" data-i18n="agro.s8.p2">Leadership technical know-how entrenches a deep understanding of how to plan, run and execute plantations - and how to secure or improve them over time.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">Locations<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Reach Lake Agro<\/h2>\s*<div class="ct-info fs-corners">\s*<h3>Lake Agro<\/h3>/,
      `<span class="fs-eyebrow" data-i18n="agro.s9.eyebrow">Locations</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="agro.s9.title">Reach Lake Agro</h2>
    <div class="ct-info fs-corners">
      <h3 data-i18n="agro.s9.name">Lake Agro</h3>`
    )
    .replace(
      /<div class="ct-label">Address<\/div><span class="ct-strong">Plot 72 &amp; 73, Vijibweni Area, Kigamboni<\/span><span class="ct-dim">P\.O\. Box 5055, Dar es Salaam, Tanzania · Serenje plantation operations<\/span>/,
      `<div class="ct-label" data-i18n="agro.s9.address">Address</div><span class="ct-strong" data-i18n="agro.s9.address.line">Plot 72 &amp; 73, Vijibweni Area, Kigamboni</span><span class="ct-dim" data-i18n="agro.s9.address.dim">P.O. Box 5055, Dar es Salaam, Tanzania · Serenje plantation operations</span>`
    )
    .replace(
      /<div class="ct-label">Email<\/div><span class="ct-strong"><a href="mailto:info@lakeagro\.com" style="color:var\(--gold\)">info@lakeagro\.com<\/a><\/span>/,
      `<div class="ct-label" data-i18n="agro.s9.email">Email</div><span class="ct-strong"><a href="mailto:info@lakeagro.com" style="color:var(--gold)">info@lakeagro.com</a></span>`
    )
    .replace(
      /<div class="ct-label">Phone<\/div><span class="ct-strong"><a href="tel:\+255222780479" style="color:var\(--gold\)">\+255 222 780 479<\/a><\/span>/,
      `<div class="ct-label" data-i18n="agro.s9.phone">Phone</div><span class="ct-strong"><a href="tel:+255222780479" style="color:var(--gold)">+255 222 780 479</a></span>`
    )
    .replace(
      /<div class="ct-label">Website<\/div><span class="ct-strong">lakeagro\.com<\/span><span class="ct-dim">Content mirrored on this Lake Group page<\/span>/,
      `<div class="ct-label" data-i18n="agro.s9.web">Website</div><span class="ct-strong">lakeagro.com</span><span class="ct-dim" data-i18n="agro.s9.web.dim">Content mirrored on this Lake Group page</span>`
    )
    .replace(/i18n-content\.js\?v=\d+/g, `i18n-content.js?v=${CACHE}`)
    .replace(/i18n\.js\?v=\d+/g, `i18n.js?v=${CACHE}`)
    .replace(/site\.js\?v=\d+/g, `site.js?v=${CACHE}`)
    .replace(/assistant\.js\?v=\d+/g, `assistant.js?v=${CACHE}`)
    .replace(/flagship-motion\.js\?v=\d+/g, `flagship-motion.js?v=${CACHE}`)
    .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${CACHE}`)
    .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${CACHE}`)
    .replace(/lake-agro\.png\?v=\d+/g, `lake-agro.png?v=${CACHE}`)
    .replace(/atl\.png\?v=\d+/g, `atl.png?v=${CACHE}`);
}

function wireAtl(html) {
  return html
    .replace(
      /<nav class="breadcrumb"><a href="index\.html" data-i18n="nav\.home">Home<\/a><span>\/<\/span><span>Manufacturing<\/span><span>\/<\/span><span>ATL<\/span><\/nav>\s*<div class="eyebrow">ATL Limited · Est\. 2019<\/div>\s*<h1>ATL<\/h1>\s*<p>Aluminium Trailers Ltd - Tanzania's aluminium fuel tanker and custom trailer manufacturer\. Your trailer partner\.<\/p>/,
      `<nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span data-i18n="atl.crumb.cat">Manufacturing</span><span>/</span><span data-i18n="atl.crumb.name">ATL</span></nav>
    <div class="eyebrow" data-i18n="atl.hero.eyebrow">ATL Limited · Est. 2019</div>
    <h1 data-i18n="atl.hero.title">ATL</h1>
    <p data-i18n="atl.hero.lede">Aluminium Trailers Ltd - Tanzania's aluminium fuel tanker and custom trailer manufacturer. Your trailer partner.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">Company Introduction<\/span><\/div>\s*<h2 class="fs-display">Engineered To Last<\/h2>\s*<hr class="fs-rule" style="margin:var\(--sp-5\) 0">\s*<p class="fs-lede">ATL Limited \(Aluminum Trailers Ltd\), established in 2019, is the only manufacturer of high-quality aluminum trailers in Tanzania\. We specialize in innovative, durable fuel transportation solutions for East and Central Africa\.<\/p>\s*<p style="margin-top:14px">With a focus on excellence, ATL has earned a reputation as a reliable name in trailer manufacturing, delivering tankers that consistently meet and surpass customer expectations\. Our strategy expands the range into premium customized trailers across the region\.<\/p>\s*<ul class="fs-check">\s*<li><span>&#10003;<\/span>Only aluminium trailer manufacturer in Tanzania<\/li>\s*<li><span>&#10003;<\/span>Fuel tankers engineered for African operating conditions<\/li>\s*<li><span>&#10003;<\/span>Custom builds with technical support and warranty<\/li>\s*<li><span>&#10003;<\/span>Facility at Kipawa, Nyerere Road \(opp\. JNIA Terminal 3\)<\/li>\s*<\/ul>/,
      `<span class="fs-eyebrow" data-i18n="atl.s1.eyebrow">Company Introduction</span></div>
        <h2 class="fs-display" data-i18n="atl.s1.title">Engineered To Last</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede" data-i18n="atl.s1.lede">ATL Limited (Aluminum Trailers Ltd), established in 2019, is the only manufacturer of high-quality aluminum trailers in Tanzania. We specialize in innovative, durable fuel transportation solutions for East and Central Africa.</p>
        <p style="margin-top:14px" data-i18n="atl.s1.p2">With a focus on excellence, ATL has earned a reputation as a reliable name in trailer manufacturing, delivering tankers that consistently meet and surpass customer expectations. Our strategy expands the range into premium customized trailers across the region.</p>
        <ul class="fs-check">
          <li><span>&#10003;</span><span data-i18n="atl.s1.check1">Only aluminium trailer manufacturer in Tanzania</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s1.check2">Fuel tankers engineered for African operating conditions</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s1.check3">Custom builds with technical support and warranty</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s1.check4">Facility at Kipawa, Nyerere Road (opp. JNIA Terminal 3)</span></li>
        </ul>`
    )
    .replace(/<h3>At a Glance<\/h3>\s*<div>\s*<div class="info-row"><span>Established<\/span><span class="badge badge-yellow">2019<\/span><\/div>\s*<div class="info-row"><span>Specialty<\/span><span class="badge badge-yellow">Aluminium tankers<\/span><\/div>\s*<div class="info-row"><span>Location<\/span><span class="badge badge-yellow">Dar es Salaam<\/span><\/div>\s*<div class="info-row"><span>Hours<\/span><span class="badge badge-yellow">Mon-Fri 8:00-16:30<\/span><\/div>\s*<div class="info-row"><span>Saturday<\/span><span class="badge badge-yellow">8:00-12:30<\/span><\/div>/,
      `<h3 data-i18n="atl.glance.title">At a Glance</h3>
          <div>
            <div class="info-row"><span data-i18n="atl.glance.est">Established</span><span class="badge badge-yellow">2019</span></div>
            <div class="info-row"><span data-i18n="atl.glance.spec">Specialty</span><span class="badge badge-yellow" data-i18n="atl.glance.specVal">Aluminium tankers</span></div>
            <div class="info-row"><span data-i18n="atl.glance.loc">Location</span><span class="badge badge-yellow" data-i18n="atl.glance.locVal">Dar es Salaam</span></div>
            <div class="info-row"><span data-i18n="atl.glance.hours">Hours</span><span class="badge badge-yellow" data-i18n="atl.glance.hoursVal">Mon-Fri 8:00-16:30</span></div>
            <div class="info-row"><span data-i18n="atl.glance.sat">Saturday</span><span class="badge badge-yellow" data-i18n="atl.glance.satVal">8:00-12:30</span></div>`)
    .replace(
      /<span class="fs-eyebrow">About the Company<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Mission, Vision &amp; Values<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="atl.s2.eyebrow">About the Company</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s2.title">Mission, Vision &amp; Values</h2>`
    )
    .replace(
      /margin-bottom:10px">Mission<\/h3>\s*<p>To design and manufacture the highest quality trailers by fostering a culture of integrity, excellence, and continuous improvement\.<\/p>/,
      `margin-bottom:10px" data-i18n="atl.s2.mission">Mission</h3>
        <p data-i18n="atl.s2.mission.body">To design and manufacture the highest quality trailers by fostering a culture of integrity, excellence, and continuous improvement.</p>`
    )
    .replace(
      /margin-bottom:10px">Vision<\/h3>\s*<p>To become the leading trailer manufacturer in East and Central Africa, providing sustainable solutions focused on safety, innovation and customization\.<\/p>/,
      `margin-bottom:10px" data-i18n="atl.s2.vision">Vision</h3>
        <p data-i18n="atl.s2.vision.body">To become the leading trailer manufacturer in East and Central Africa, providing sustainable solutions focused on safety, innovation and customization.</p>`
    )
    .replace(/<div class="val-mini-tile"><h4>Integrity<\/h4><p>Honesty, transparency and accountability\. We deliver on promises and maintain a strong moral compass\.<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="atl.val.integrity">Integrity</h4><p data-i18n="atl.val.integrity.d">Honesty, transparency and accountability. We deliver on promises and maintain a strong moral compass.</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>People<\/h4><p>Employees are our greatest asset - safety, inclusion, professional development and a positive culture\.<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="atl.val.people">People</h4><p data-i18n="atl.val.people.d">Employees are our greatest asset - safety, inclusion, professional development and a positive culture.</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Sustainability<\/h4><p>Lower impact materials and processes; products that support greener transport requirements\.<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="atl.val.sust">Sustainability</h4><p data-i18n="atl.val.sust.d">Lower impact materials and processes; products that support greener transport requirements.</p></div>`)
    .replace(/<div class="val-mini-tile"><h4>Customers<\/h4><p>Long-term partners built on trust, value, quality and reliability - not one-off sales\.<\/p><\/div>/,
      `<div class="val-mini-tile"><h4 data-i18n="atl.val.cust">Customers</h4><p data-i18n="atl.val.cust.d">Long-term partners built on trust, value, quality and reliability - not one-off sales.</p></div>`)
    .replace(
      /<span class="fs-eyebrow">Brand Promise<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Savings · Safety · Solutions<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="atl.s3.eyebrow">Brand Promise</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s3.title">Savings · Safety · Solutions</h2>`
    )
    .replace(
      /margin-bottom:10px">Savings<\/h4>\s*<ul class="fs-check" style="margin-top:0">\s*<li><span>&#10003;<\/span>Light trailers<\/li>\s*<li><span>&#10003;<\/span>More payload<\/li>\s*<li><span>&#10003;<\/span>Increased fuel efficiency<\/li>\s*<li><span>&#10003;<\/span>Long-term savings on maintenance and repairs<\/li>\s*<\/ul>/,
      `margin-bottom:10px" data-i18n="atl.s3.savings">Savings</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span><span data-i18n="atl.s3.savings.1">Light trailers</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.savings.2">More payload</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.savings.3">Increased fuel efficiency</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.savings.4">Long-term savings on maintenance and repairs</span></li>
        </ul>`
    )
    .replace(
      /margin-bottom:10px">Safety<\/h4>\s*<ul class="fs-check" style="margin-top:0">\s*<li><span>&#10003;<\/span>Air suspension for tankers<\/li>\s*<li><span>&#10003;<\/span>Reliable braking systems<\/li>\s*<li><span>&#10003;<\/span>Strategic flooding points<\/li>\s*<li><span>&#10003;<\/span>Secure coupling systems<\/li>\s*<li><span>&#10003;<\/span>High-visibility reflectors<\/li>\s*<\/ul>/,
      `margin-bottom:10px" data-i18n="atl.s3.safety">Safety</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span><span data-i18n="atl.s3.safety.1">Air suspension for tankers</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.safety.2">Reliable braking systems</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.safety.3">Strategic flooding points</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.safety.4">Secure coupling systems</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.safety.5">High-visibility reflectors</span></li>
        </ul>`
    )
    .replace(
      /margin-bottom:10px">Solutions<\/h4>\s*<ul class="fs-check" style="margin-top:0">\s*<li><span>&#10003;<\/span>Customized tailor designs<\/li>\s*<li><span>&#10003;<\/span>Technical support<\/li>\s*<li><span>&#10003;<\/span>Warranty and maintenance<\/li>\s*<li><span>&#10003;<\/span>Personalized service<\/li>\s*<li><span>&#10003;<\/span>Cost-effectiveness<\/li>\s*<\/ul>/,
      `margin-bottom:10px" data-i18n="atl.s3.solutions">Solutions</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span><span data-i18n="atl.s3.solutions.1">Customized tailor designs</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.solutions.2">Technical support</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.solutions.3">Warranty and maintenance</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.solutions.4">Personalized service</span></li>
          <li><span>&#10003;</span><span data-i18n="atl.s3.solutions.5">Cost-effectiveness</span></li>
        </ul>`
    )
    .replace(
      /<span class="fs-eyebrow">Why Aluminium<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Material Advantages<\/h2>/,
      `<span class="fs-eyebrow" data-i18n="atl.s4.eyebrow">Why Aluminium</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s4.title">Material Advantages</h2>`
    )
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Non-Reactive<\/h4><p style="font-size:\.86rem;margin-top:6px">Aluminum is non-reactive with most fuels, helping prevent contamination - especially important for sensitive fuels including aviation fuel\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.non.title">Non-Reactive</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.non.body">Aluminum is non-reactive with most fuels, helping prevent contamination - especially important for sensitive fuels including aviation fuel.</p>`)
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Corrosion Resistant<\/h4><p style="font-size:\.86rem;margin-top:6px">Naturally resists rust in harsh weather and moisture, reducing maintenance and prolonging tanker life\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.corr.title">Corrosion Resistant</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.corr.body">Naturally resists rust in harsh weather and moisture, reducing maintenance and prolonging tanker life.</p>`)
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Fuel Efficiency<\/h4><p style="font-size:\.86rem;margin-top:6px">Lower tare weight means more legal payload and less energy to haul the tanker\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.fuel.title">Fuel Efficiency</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.fuel.body">Lower tare weight means more legal payload and less energy to haul the tanker.</p>`)
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Strength &amp; Safety<\/h4><p style="font-size:\.86rem;margin-top:6px">High strength-to-weight ratio for transport stresses, with impact absorption that supports operational safety\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.str.title">Strength &amp; Safety</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.str.body">High strength-to-weight ratio for transport stresses, with impact absorption that supports operational safety.</p>`)
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Environment<\/h4><p style="font-size:\.86rem;margin-top:6px">Highly recyclable aluminium with lower recycling energy versus primary production - aligned with strict fuel-transport standards\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.env.title">Environment</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.env.body">Highly recyclable aluminium with lower recycling energy versus primary production - aligned with strict fuel-transport standards.</p>`)
    .replace(/<h4 style="font-family:var\(--font-display\);font-weight:400;font-size:1\.05rem;letter-spacing:\.03em;text-transform:uppercase">Custom Range<\/h4><p style="font-size:\.86rem;margin-top:6px">Expanding beyond fuel tankers into premium customized trailers for regional logistics needs\.<\/p>/,
      `<h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase" data-i18n="atl.s4.custom.title">Custom Range</h4><p style="font-size:.86rem;margin-top:6px" data-i18n="atl.s4.custom.body">Expanding beyond fuel tankers into premium customized trailers for regional logistics needs.</p>`)
    .replace(
      /<span class="fs-eyebrow">Products<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Tankers &amp; Custom Trailers for Africa<\/h2>\s*<p class="fs-lede" style="max-width:70ch;margin-bottom:var\(--sp-6\)">Discover our range of high-quality aluminum fuel tankers designed for safety, durability, and efficiency\. Each model is built to meet industry standards and tailored to your specific needs\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="atl.s5.eyebrow">Products</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s5.title">Tankers &amp; Custom Trailers for Africa</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-6)" data-i18n="atl.s5.lede">Discover our range of high-quality aluminum fuel tankers designed for safety, durability, and efficiency. Each model is built to meet industry standards and tailored to your specific needs.</p>`
    )
    .replace(/<h4>Aluminium Fuel Tankers<\/h4>\s*<p>High-quality aluminum fuel tankers designed for safety, durability and efficiency on African routes\.<\/p>/,
      `<h4 data-i18n="atl.s5.tankers.title">Aluminium Fuel Tankers</h4>
        <p data-i18n="atl.s5.tankers.body">High-quality aluminum fuel tankers designed for safety, durability and efficiency on African routes.</p>`)
    .replace(/<h4>Custom Trailers<\/h4>\s*<p>Tailored trailer configurations to match payload, coupling and operating requirements\.<\/p>/,
      `<h4 data-i18n="atl.s5.custom.title">Custom Trailers</h4>
        <p data-i18n="atl.s5.custom.body">Tailored trailer configurations to match payload, coupling and operating requirements.</p>`)
    .replace(/<h4>Support &amp; Warranty<\/h4>\s*<p>Technical support, warranty coverage and maintenance partnership after delivery\.<\/p>/,
      `<h4 data-i18n="atl.s5.support.title">Support &amp; Warranty</h4>
        <p data-i18n="atl.s5.support.body">Technical support, warranty coverage and maintenance partnership after delivery.</p>`)
    .replace(
      /<span class="fs-eyebrow">Testimonials<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">What Clients Say<\/h2>\s*<p style="max-width:70ch;margin-bottom:var\(--sp-6\);color:var\(--ink-mute\)">At ATL, we pride ourselves on trailers that deliver unmatched performance, durability, and value\. Hear from the people who rely on our aluminum trailers every day\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="atl.s6.eyebrow">Testimonials</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s6.title">What Clients Say</h2>
    <p style="max-width:70ch;margin-bottom:var(--sp-6);color:var(--ink-mute)" data-i18n="atl.s6.lede">At ATL, we pride ourselves on trailers that deliver unmatched performance, durability, and value. Hear from the people who rely on our aluminum trailers every day.</p>`
    )
    .replace(
      /"Thank you, Aluminum Trailers Limited\. Looking forward for more transformation of our trailers with you\. As you won't find a better customer servicing of high quality manufacturing anywhere else in East Africa, it just allows us to rely on you comfortably\."<\/p>\s*<p style="margin-top:14px;color:var\(--gold\);font-weight:700;letter-spacing:\.06em;text-transform:uppercase;font-size:\.78rem">MOIL Company CEO<\/p>/,
      `"Thank you, Aluminum Trailers Limited. Looking forward for more transformation of our trailers with you. As you won't find a better customer servicing of high quality manufacturing anywhere else in East Africa, it just allows us to rely on you comfortably."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem" data-i18n="atl.s6.q1.by">MOIL Company CEO</p>`
    )
    .replace(
      /font-size:1\.05rem;line-height:1\.7;color:var\(--ink-mute\)">"Thank you, Aluminum Trailers Limited/,
      `font-size:1.05rem;line-height:1.7;color:var(--ink-mute)" data-i18n="atl.s6.q1">"Thank you, Aluminum Trailers Limited`
    )
    .replace(
      /"From fabrication to manufacturing quality - the effective best manufacturing tanker company I have dealt with\. Higher volumes loaded, many trips in a short time\. The overall merits of the trailer are amazing\."<\/p>\s*<p style="margin-top:14px;color:var\(--gold\);font-weight:700;letter-spacing:\.06em;text-transform:uppercase;font-size:\.78rem">Orange Gas Co\. Ltd CEO<\/p>/,
      `"From fabrication to manufacturing quality - the effective best manufacturing tanker company I have dealt with. Higher volumes loaded, many trips in a short time. The overall merits of the trailer are amazing."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem" data-i18n="atl.s6.q2.by">Orange Gas Co. Ltd CEO</p>`
    )
    .replace(
      /font-size:1\.05rem;line-height:1\.7;color:var\(--ink-mute\)">"From fabrication to manufacturing quality/,
      `font-size:1.05rem;line-height:1.7;color:var(--ink-mute)" data-i18n="atl.s6.q2">"From fabrication to manufacturing quality`
    )
    .replace(
      /<span class="fs-eyebrow">Partners<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Financial Partners<\/h2>\s*<p class="fs-lede" style="max-width:65ch;margin-bottom:var\(--sp-6\)">ATL works with leading regional financial and commercial partners supporting fleet and manufacturing growth\.<\/p>/,
      `<span class="fs-eyebrow" data-i18n="atl.s7.eyebrow">Partners</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s7.title">Financial Partners</h2>
    <p class="fs-lede" style="max-width:65ch;margin-bottom:var(--sp-6)" data-i18n="atl.s7.lede">ATL works with leading regional financial and commercial partners supporting fleet and manufacturing growth.</p>`
    )
    .replace(
      /<span class="fs-eyebrow">Location<\/span><\/div>\s*<h2 class="fs-display" style="margin-bottom:var\(--sp-6\)">Visit ATL<\/h2>\s*<div class="ct-info fs-on-dark fs-corners">\s*<h3>ATL Limited<\/h3>/,
      `<span class="fs-eyebrow" data-i18n="atl.s8.eyebrow">Location</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)" data-i18n="atl.s8.title">Visit ATL</h2>
    <div class="ct-info fs-on-dark fs-corners">
      <h3 data-i18n="atl.s8.name">ATL Limited</h3>`
    )
    .replace(
      /<div class="ct-label">Address<\/div><span class="ct-strong">Kipawa, Nyerere Road<\/span><span class="ct-dim">Opposite Julius Nyerere Airport Terminal 3, Dar es Salaam<\/span>/,
      `<div class="ct-label" data-i18n="atl.s8.address">Address</div><span class="ct-strong" data-i18n="atl.s8.address.line">Kipawa, Nyerere Road</span><span class="ct-dim" data-i18n="atl.s8.address.dim">Opposite Julius Nyerere Airport Terminal 3, Dar es Salaam</span>`
    )
    .replace(
      /<div class="ct-label">Work Hours<\/div><span class="ct-strong">Mon-Fri 8:00am - 16:30pm<\/span><span class="ct-dim">Sat 8:00am - 12:30pm<\/span>/,
      `<div class="ct-label" data-i18n="atl.s8.hours">Work Hours</div><span class="ct-strong" data-i18n="atl.s8.hours.line">Mon-Fri 8:00am - 16:30pm</span><span class="ct-dim" data-i18n="atl.s8.hours.dim">Sat 8:00am - 12:30pm</span>`
    )
    .replace(
      /<div class="ct-label">Website<\/div><span class="ct-strong">atl-tz\.com<\/span><span class="ct-dim">Content mirrored on this Lake Group page<\/span>/,
      `<div class="ct-label" data-i18n="atl.s8.web">Website</div><span class="ct-strong">atl-tz.com</span><span class="ct-dim" data-i18n="atl.s8.web.dim">Content mirrored on this Lake Group page</span>`
    )
    .replace(/i18n-content\.js\?v=\d+/g, `i18n-content.js?v=${CACHE}`)
    .replace(/i18n\.js\?v=\d+/g, `i18n.js?v=${CACHE}`)
    .replace(/site\.js\?v=\d+/g, `site.js?v=${CACHE}`)
    .replace(/assistant\.js\?v=\d+/g, `assistant.js?v=${CACHE}`)
    .replace(/flagship-motion\.js\?v=\d+/g, `flagship-motion.js?v=${CACHE}`)
    .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${CACHE}`)
    .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${CACHE}`)
    .replace(/lake-agro\.png\?v=\d+/g, `lake-agro.png?v=${CACHE}`)
    .replace(/atl\.png\?v=\d+/g, `atl.png?v=${CACHE}`);
}

function main() {
  const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const keyCount = mergeKeys(content);
  fs.writeFileSync(JSON_PATH, JSON.stringify(content, null, 2), 'utf8');
  fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(content) + ';\n', 'utf8');
  console.log('Merged', keyCount, 'keys × 5 langs');

  const agroPath = path.join(ROOT, 'lake-agro.html');
  const atlPath = path.join(ROOT, 'atl.html');
  let agro = fs.readFileSync(agroPath, 'utf8');
  let atl = fs.readFileSync(atlPath, 'utf8');
  const agroBefore = (agro.match(/data-i18n="agro\./g) || []).length;
  const atlBefore = (atl.match(/data-i18n="atl\./g) || []).length;
  agro = wireAgro(agro);
  atl = wireAtl(atl);
  fs.writeFileSync(agroPath, agro);
  fs.writeFileSync(atlPath, atl);
  const agroAfter = (agro.match(/data-i18n="agro\./g) || []).length;
  const atlAfter = (atl.match(/data-i18n="atl\./g) || []).length;
  console.log('agro data-i18n:', agroBefore, '→', agroAfter);
  console.log('atl data-i18n:', atlBefore, '→', atlAfter);
  if (agroAfter < 20) console.warn('WARNING: agro wiring may have failed');
  if (atlAfter < 20) console.warn('WARNING: atl wiring may have failed');
}

main();
