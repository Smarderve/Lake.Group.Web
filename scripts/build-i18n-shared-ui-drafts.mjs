import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateTranslationResult } from '../backend/src/lib/cms-v2-translation.js';

const DICTIONARY_PATH = resolve('assets/i18n-content.json');
const OUTPUT_ROOT = resolve('scripts/i18n-drafts');
const LOCALES = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const keysForBatch = (dictionary) => Object.keys(dictionary.en || {}).filter((key) => /^(?:nav|mob|footer)\./.test(key));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// This seed adds the 85 shared navigation/mobile/footer labels missing from
// the Hindi and Simplified Chinese dictionaries, plus four absent footer
// translations in locales whose older dictionaries omit them. All authored
// rows remain editorial drafts; this script cannot approve or publish them.
const authored = {
  hi: {
    'nav.home': 'होम', 'nav.about': 'हमारे बारे में', 'nav.services': 'सेवाएँ', 'nav.dd.energy': 'ऊर्जा',
    'nav.fuel': 'ईंधन और पेट्रोलियम', 'nav.lpg': 'एलपीजी गैस', 'nav.lubricants': 'स्नेहक', 'nav.dd.industry': 'उद्योग',
    'nav.steel': 'Lake Steel', 'nav.concrete': 'कंक्रीट और एग्रीगेट', 'nav.dd.logistics': 'लॉजिस्टिक्स',
    'nav.logistics': 'परिवहन और माल ढुलाई', 'nav.containers': 'कंटेनर सेवाएँ', 'nav.companies': 'व्यावसायिक क्षेत्र',
    'mob.companies': 'व्यावसायिक क्षेत्र', 'nav.dd.energies': 'ऊर्जा क्षेत्र', 'nav.dd.manufacturing': 'विनिर्माण क्षेत्र',
    'nav.dd.logisticsCos': 'लॉजिस्टिक्स क्षेत्र', 'nav.dd.realEstate': 'रियल एस्टेट क्षेत्र', 'nav.dd.agro': 'कृषि प्रसंस्करण क्षेत्र',
    'nav.dd.automotive': 'ऑटोमोटिव क्षेत्र', 'nav.co.lakeOil': 'Lake Oil', 'nav.co.lakeAviation': 'Lake Aviation',
    'nav.co.lakeGas': 'Lake Gas', 'nav.co.lakeLubes': 'Lake Lubes', 'nav.co.lakeBuildings': 'Lake Building Solution',
    'nav.co.lakePipes': 'Lake Pipes', 'nav.co.lakeSteel': 'Lake Steel', 'nav.co.lakeCylinders': 'Lake Cylinders',
    'nav.co.gulfAggregates': 'Gulf Aggregates', 'nav.co.atl': 'ATL', 'nav.co.lakePremixCement': 'Lake Premix',
    'nav.co.aficd': 'AFICD', 'nav.co.aill': 'AILL', 'nav.co.lakeTrans': 'Lake Trans',
    'nav.co.crossCountry': 'Cross Country', 'nav.co.lakeAgro': 'Lake Agro', 'nav.co.assemblyTech': 'Assembly Tech Limited',
    'nav.co.agrinovaTech': 'Agrinova Tech Limited', 'nav.co.nextDriveMotors': 'NextDrive Motors Limited',
    'nav.network': 'संचालन मानचित्र', 'nav.africaMap': 'संचालन मानचित्र', 'nav.stations': 'स्टेशन खोजें',
    'nav.fleet': 'हमारा बेड़ा', 'nav.company': 'कॉर्पोरेट', 'nav.history': 'हमारा इतिहास', 'nav.leadership': 'नेतृत्व',
    'nav.csr': 'सीएसआर और सतत विकास', 'nav.investors': 'निवेशक संबंध', 'nav.gallery': 'गैलरी', 'nav.news': 'समाचार',
    'nav.careers': 'करियर', 'nav.fuelShort': 'ईंधन', 'nav.steelShort': 'इस्पात', 'nav.concreteShort': 'कंक्रीट',
    'nav.transportShort': 'परिवहन', 'nav.containersShort': 'कंटेनर', 'nav.africaMapShort': 'संचालन मानचित्र',
    'nav.historyShort': 'इतिहास', 'nav.csrShort': 'सीएसआर', 'nav.investorsShort': 'निवेशक', 'nav.aboutUs': 'हमारे बारे में',
    'mob.services': 'सेवाएँ', 'mob.network': 'संचालन मानचित्र', 'mob.company': 'कॉर्पोरेट', 'mob.more': 'और',
    'footer.motto': 'गुणवत्ता, सेवा, सुरक्षा, पेशेवर उत्कृष्टता', 'footer.contact': 'संपर्क करें',
    'footer.services': 'व्यावसायिक क्षेत्र', 'footer.viewAllCompanies': 'सभी व्यावसायिक क्षेत्र देखें',
    'footer.company': 'कॉर्पोरेट', 'footer.contactHeading': 'संपर्क',
    'footer.address': 'प्लॉट 72 और 73, विजिब्वेनी क्षेत्र, किगाम्बोनी, दार एस सलाम',
    'footer.rights': 'सर्वाधिकार सुरक्षित।', 'footer.privacy': 'गोपनीयता', 'footer.terms': 'नियम और शर्तें',
    'nav.contact': 'संपर्क करें', 'mob.language': 'भाषा', 'nav.menu': 'मेनू', 'footer.youtube': 'YouTube',
    'footer.instagram': 'Instagram', 'footer.whatsapp': 'WhatsApp', 'footer.question': 'क्या आपका कोई प्रश्न है?',
    'footer.connect': 'हमसे जुड़ें', 'footer.facebook': 'Facebook',
  },
  zh: {
    'nav.home': '首页', 'nav.about': '关于我们', 'nav.services': '服务', 'nav.dd.energy': '能源',
    'nav.fuel': '燃料与石油', 'nav.lpg': '液化石油气', 'nav.lubricants': '润滑油', 'nav.dd.industry': '工业',
    'nav.steel': 'Lake Steel', 'nav.concrete': '混凝土与骨料', 'nav.dd.logistics': '物流', 'nav.logistics': '运输与货运',
    'nav.containers': '集装箱服务', 'nav.companies': '业务板块', 'mob.companies': '业务板块',
    'nav.dd.energies': '能源板块', 'nav.dd.manufacturing': '制造板块', 'nav.dd.logisticsCos': '物流板块',
    'nav.dd.realEstate': '房地产板块', 'nav.dd.agro': '农产品加工板块', 'nav.dd.automotive': '汽车板块',
    'nav.co.lakeOil': 'Lake Oil', 'nav.co.lakeAviation': 'Lake Aviation', 'nav.co.lakeGas': 'Lake Gas',
    'nav.co.lakeLubes': 'Lake Lubes', 'nav.co.lakeBuildings': 'Lake Building Solution', 'nav.co.lakePipes': 'Lake Pipes',
    'nav.co.lakeSteel': 'Lake Steel', 'nav.co.lakeCylinders': 'Lake Cylinders', 'nav.co.gulfAggregates': 'Gulf Aggregates',
    'nav.co.atl': 'ATL', 'nav.co.lakePremixCement': 'Lake Premix', 'nav.co.aficd': 'AFICD', 'nav.co.aill': 'AILL',
    'nav.co.lakeTrans': 'Lake Trans', 'nav.co.crossCountry': 'Cross Country', 'nav.co.lakeAgro': 'Lake Agro',
    'nav.co.assemblyTech': 'Assembly Tech Limited', 'nav.co.agrinovaTech': 'Agrinova Tech Limited',
    'nav.co.nextDriveMotors': 'NextDrive Motors Limited', 'nav.network': '运营地图', 'nav.africaMap': '运营地图',
    'nav.stations': '加油站查询', 'nav.fleet': '我们的车队', 'nav.company': '企业信息', 'nav.history': '发展历程',
    'nav.leadership': '领导团队', 'nav.csr': '企业社会责任与可持续发展', 'nav.investors': '投资者关系',
    'nav.gallery': '图库', 'nav.news': '新闻', 'nav.careers': '职业发展', 'nav.fuelShort': '燃料',
    'nav.steelShort': '钢铁', 'nav.concreteShort': '混凝土', 'nav.transportShort': '运输', 'nav.containersShort': '集装箱',
    'nav.africaMapShort': '运营地图', 'nav.historyShort': '历史', 'nav.csrShort': '企业社会责任',
    'nav.investorsShort': '投资者', 'nav.aboutUs': '关于我们', 'mob.services': '服务', 'mob.network': '运营地图',
    'mob.company': '企业信息', 'mob.more': '更多', 'footer.motto': '品质、服务、安全、专业',
    'footer.contact': '联系我们', 'footer.services': '业务板块', 'footer.viewAllCompanies': '查看所有业务板块',
    'footer.company': '企业信息', 'footer.contactHeading': '联系方式',
    'footer.address': '72和73号地块，Vijibweni区，Kigamboni，达累斯萨拉姆', 'footer.rights': '版权所有。',
    'footer.privacy': '隐私', 'footer.terms': '条款', 'nav.contact': '联系我们', 'mob.language': '语言',
    'nav.menu': '菜单', 'footer.youtube': 'YouTube', 'footer.instagram': 'Instagram', 'footer.whatsapp': 'WhatsApp',
    'footer.question': '有问题吗？', 'footer.connect': '联系我们', 'footer.facebook': 'Facebook',
  },
  sw: { 'nav.steel': 'Lake Steel' },
  ar: {
    'nav.steel': 'Lake Steel', 'nav.co.lakeOil': 'Lake Oil', 'nav.co.lakeSteel': 'Lake Steel',
    'nav.co.lakeTrans': 'Lake Trans', 'nav.co.lakeAgro': 'Lake Agro',
    'nav.co.assemblyTech': 'Assembly Tech Limited', 'nav.co.agrinovaTech': 'Agrinova Tech Limited',
    'nav.co.nextDriveMotors': 'NextDrive Motors Limited',
    'footer.address': 'القطعتان 72 و73، منطقة فيجيبويني، كيغامبوني، دار السلام',
    'footer.question': 'هل لديك سؤال؟', 'footer.connect': 'تواصل معنا',
  },
  fr: { 'nav.steel': 'Lake Steel', 'footer.question': 'Une question ?', 'footer.connect': 'Contactez-nous' },
  es: { 'nav.steel': 'Lake Steel', 'footer.question': '¿Tiene alguna pregunta?', 'footer.connect': 'Conéctese con nosotros' },
  pt: { 'nav.steel': 'Lake Steel', 'footer.question': 'Tem alguma dúvida?', 'footer.connect': 'Fale conosco' },
};

const heroAuthored = {
  hi: {
    'hero.slide1': 'दो दशकों से पूर्वी अफ्रीका को ऊर्जा प्रदान कर रहे हैं',
    'hero.slide2': 'प्रगति की नींव का निर्माण।',
    'hero.slide3': 'ऑटोमोटिव उत्कृष्टता के माध्यम से गतिशीलता का भविष्य गढ़ना।',
    'hero.slide4': 'पूरे क्षेत्र में रणनीतिक वाणिज्यिक केंद्र विकसित करना।',
    'hero.slide5': 'पूर्वी अफ्रीका में कृषि और कृषि-प्रसंस्करण को आगे बढ़ाना।',
    'hero.slide6': 'दार एस सलाम: वैश्विक व्यापार के लिए पूर्वी अफ्रीका का प्रवेशद्वार।',
  },
  ar: {
    'hero.slide1': 'نمدّ شرق أفريقيا بالطاقة منذ عقدين',
    'hero.slide2': 'نصنع أسس التقدم.',
    'hero.slide3': 'نرسم مستقبل التنقل عبر التميز في صناعة السيارات.',
    'hero.slide4': 'نبني مراكز تجارية استراتيجية في أنحاء المنطقة.',
    'hero.slide5': 'نطوّر الزراعة والتصنيع الزراعي في شرق أفريقيا.',
    'hero.slide6': 'دار السلام: بوابة شرق أفريقيا إلى التجارة العالمية.',
  },
  zh: {
    'hero.slide1': '二十年来为东非提供能源',
    'hero.slide2': '打造进步的基石。',
    'hero.slide3': '以卓越汽车制造塑造出行未来。',
    'hero.slide4': '在本地区建设战略性商业枢纽。',
    'hero.slide5': '推动东非农业与农产品加工发展。',
    'hero.slide6': '达累斯萨拉姆：东非通往全球贸易的门户。',
  },
  fr: {
    'hero.slide1': "Depuis deux décennies, nous fournissons de l'énergie à l'Afrique de l'Est.",
    'hero.slide2': 'Bâtir les fondations du progrès.',
    'hero.slide3': "Façonner l'avenir de la mobilité grâce à l'excellence automobile.",
    'hero.slide4': 'Créer des pôles commerciaux stratégiques dans toute la région.',
    'hero.slide5': "Faire progresser l'agriculture et l'agro-industrie en Afrique de l'Est.",
    'hero.slide6': "Dar es Salaam : la porte de l'Afrique de l'Est sur le commerce mondial.",
  },
  es: {
    'hero.slide1': 'Impulsando África Oriental durante dos décadas.',
    'hero.slide2': 'Fabricando los cimientos del progreso.',
    'hero.slide3': 'Dando forma al futuro de la movilidad mediante la excelencia automotriz.',
    'hero.slide4': 'Construyendo centros comerciales estratégicos en toda la región.',
    'hero.slide5': 'Impulsando la agricultura y la agroindustria en África Oriental.',
    'hero.slide6': 'Dar es Salaam: la puerta de África Oriental al comercio mundial.',
  },
  pt: {
    'hero.slide1': 'Abastecendo a África Oriental há duas décadas.',
    'hero.slide2': 'Construindo os alicerces do progresso.',
    'hero.slide3': 'Construindo o futuro da mobilidade com excelência automotiva.',
    'hero.slide4': 'Criando centros comerciais estratégicos em toda a região.',
    'hero.slide5': 'Impulsionando a agricultura e o processamento agroindustrial na África Oriental.',
    'hero.slide6': 'Dar es Salaam: a porta da África Oriental para o comércio global.',
  },
};

export async function buildSharedUiDrafts({ dictionaryPath = DICTIONARY_PATH, outputRoot = OUTPUT_ROOT } = {}) {
  const dictionary = JSON.parse(await readFile(dictionaryPath, 'utf8'));
  const keys = keysForBatch(dictionary);
  const sourceDigest = sha256(JSON.stringify(keys.map((key) => [key, dictionary.en[key]])));
  const output = {};
  for (const locale of LOCALES) {
    const path = resolve(outputRoot, locale, 'shared-ui.json');
    let previous = null;
    try { previous = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const previousRows = new Map((previous?.translations || []).map((row) => [row.id, row]));
    const translations = keys.map((key) => {
      const source = dictionary.en[key];
      const existing = dictionary[locale]?.[key];
      const authoredValue = authored[locale]?.[key];
      const sourceHash = sha256(`${key}\0${source}`);
      const previousRow = previousRows.get(`dict.${key}`);
      const preserveDraft = previousRow?.sourceHash === sourceHash && typeof previousRow.translation === 'string' && previousRow.translation.trim();
      const seededTranslation = typeof authoredValue === 'string' ? authoredValue : existing;
      const translation = preserveDraft ? previousRow.translation : seededTranslation;
      if (typeof translation !== 'string' || !translation.trim()) throw new Error(`Missing ${locale} translation for ${key}`);
      const validation = validateTranslationResult({ sourceText: source }, translation);
      if (!validation.valid) throw new Error(`${locale}.${key}: ${validation.errors.join(', ')}`);
      return {
        id: `dict.${key}`, sourceHash, key, source, translation,
        origin: preserveDraft
          ? (previousRow.translation !== seededTranslation ? 'preserved-editorial-draft' : (previousRow.origin || 'preserved-editorial-draft'))
          : (typeof authoredValue === 'string' ? 'ai-authored-draft' : 'reused-existing-dictionary'),
        validation: 'structural checks passed; linguistic review required',
      };
    });
    const draft = {
      schemaVersion: 1, status: 'DRAFT_PENDING_HUMAN_REVIEW', locale,
      batch: 'shared-navigation-mobile-footer', sourceDigest,
      authoringMethod: 'existing dictionary reuse plus AI-authored text; not machine-model output',
      createdAt: previous?.createdAt || new Date().toISOString(), reviewEvidence: null, releaseEligible: false, candidateCount: keys.length,
      translatedCount: translations.length, translations,
    };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`);
    output[locale] = { path, translated: translations.length, reused: translations.filter((row) => row.origin === 'reused-existing-dictionary').length, authored: translations.filter((row) => row.origin === 'ai-authored-draft').length };
  }
  const heroCarousel = await buildHeroCarouselDrafts({ dictionaryPath, outputRoot });
  return { sourceDigest, keys: keys.length, locales: output, heroCarousel };
}

export async function buildHeroCarouselDrafts({ dictionaryPath = DICTIONARY_PATH, outputRoot = OUTPUT_ROOT } = {}) {
  const dictionary = JSON.parse(await readFile(dictionaryPath, 'utf8'));
  const keys = ['hero.slide1', 'hero.slide2', 'hero.slide3', 'hero.slide4', 'hero.slide5', 'hero.slide6'];
  const sourceDigest = sha256(JSON.stringify(keys.map((key) => [key, dictionary.en[key]])));
  const output = {};
  for (const locale of LOCALES) {
    const path = resolve(outputRoot, locale, 'hero-carousel.json');
    let previous = null;
    try { previous = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const previousRows = new Map((previous?.translations || []).map((row) => [row.id, row]));
    const translations = keys.map((key) => {
      const source = dictionary.en?.[key];
      if (typeof source !== 'string' || !source.trim()) throw new Error(`Missing authoritative English hero source ${key}`);
      const existing = dictionary[locale]?.[key];
      const authoredValue = heroAuthored[locale]?.[key];
      const sourceHash = sha256(`${key}\0${source}`);
      const previousRow = previousRows.get(`dict.${key}`);
      const preserveDraft = previousRow?.sourceHash === sourceHash && typeof previousRow.translation === 'string' && previousRow.translation.trim();
      const seededTranslation = typeof authoredValue === 'string' ? authoredValue : existing;
      const translation = preserveDraft ? previousRow.translation : seededTranslation;
      if (typeof translation !== 'string' || !translation.trim()) throw new Error(`Missing ${locale} translation for ${key}`);
      const validation = validateTranslationResult({ sourceText: source }, translation);
      if (!validation.valid) throw new Error(`${locale}.${key}: ${validation.errors.join(', ')}`);
      return {
        id: `dict.${key}`, sourceHash, key, source, translation,
        origin: preserveDraft
          ? (previousRow.translation !== seededTranslation ? 'preserved-editorial-draft' : (previousRow.origin || 'preserved-editorial-draft'))
          : (typeof authoredValue === 'string' ? 'ai-authored-draft' : 'reused-existing-dictionary'),
        validation: 'structural checks passed; linguistic review required',
      };
    });
    const draft = {
      schemaVersion: 1, status: 'DRAFT_PENDING_HUMAN_REVIEW', locale,
      batch: 'homepage-hero-carousel', sourceDigest,
      authoringMethod: 'existing dictionary reuse plus AI-authored text; not machine-model output',
      createdAt: previous?.createdAt || new Date().toISOString(), reviewEvidence: null,
      releaseEligible: false, candidateCount: keys.length, translatedCount: translations.length, translations,
    };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`);
    output[locale] = { path, translated: translations.length, reused: translations.filter((row) => row.origin === 'reused-existing-dictionary').length, authored: translations.filter((row) => row.origin === 'ai-authored-draft').length };
  }
  return { sourceDigest, keys: keys.length, locales: output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildSharedUiDrafts().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
