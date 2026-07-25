/**
 * Patch gallery count strings + homepage coverflow caption keys across
 * en/fr/sw/hi/ar, then regenerate assets/i18n-content.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');
const MASTER_PATH = path.join(ROOT, 'scripts', '_master_en.json');

const galleryUpdates = {
  en: {
    'gallery.6': 'Lake Group in Action',
    'gallery.7': '',
    'gallery.9': 'All',
    'gallery.10': 'Operations',
    'gallery.11': 'Fuel & Oil',
    'gallery.12': 'LPG Gas',
    'gallery.13': 'GCCP Concrete',
    'gallery.14': 'MERM Dubai',
    'gallery.54': 'Real photos from Lake Group operations, GCCP, MERM Dubai, Lake Gas, Lake Oil & more.',
    'gallery.55': 'Real photos'
  },
  fr: {
    'gallery.6': 'Lake Group en action',
    'gallery.7': '',
    'gallery.9': 'Tous',
    'gallery.10': 'Opérations',
    'gallery.11': 'Carburant et pétrole',
    'gallery.12': 'Gaz GPL',
    'gallery.13': 'Béton GCCP',
    'gallery.14': 'MERM Dubaï',
    'gallery.54': 'Photos réelles des opérations de Lake Group, GCCP, MERM Dubaï, Lake Gas, Lake Oil et plus encore.',
    'gallery.55': 'Photos réelles'
  },
  sw: {
    'gallery.6': 'Lake Group Kazini',
    'gallery.7': '',
    'gallery.9': 'Zote',
    'gallery.10': 'Shughuli',
    'gallery.11': 'Mafuta na Oili',
    'gallery.12': 'Gesi ya LPG',
    'gallery.13': 'Zege la GCCP',
    'gallery.14': 'MERM Dubai',
    'gallery.54': 'Picha halisi kutoka kwenye shughuli za Lake Group, GCCP, MERM Dubai, Lake Gas, Lake Oil na zaidi.',
    'gallery.55': 'Picha halisi'
  },
  hi: {
    'gallery.6': 'लेक ग्रुप कार्रवाई में',
    'gallery.7': '',
    'gallery.9': 'सभी',
    'gallery.10': 'संचालन',
    'gallery.11': 'ईंधन एवं तेल',
    'gallery.12': 'LPG गैस',
    'gallery.13': 'जीसीसीपी कंक्रीट',
    'gallery.14': 'एमईआरएम दुबई',
    'gallery.54': 'लेक ग्रुप संचालन, GCCP, MERM दुबई, Lake Gas, लेक ऑयल और अन्य से वास्तविक तस्वीरें।',
    'gallery.55': 'वास्तविक तस्वीरें'
  },
  ar: {
    'gallery.6': 'مجموعة ليك قيد التنفيذ',
    'gallery.7': '',
    'gallery.9': 'الكل',
    'gallery.10': 'العمليات',
    'gallery.11': 'الوقود والزيوت',
    'gallery.12': 'غاز LPG',
    'gallery.13': 'خرسانة GCCP',
    'gallery.14': 'ميرم دبي',
    'gallery.54': 'صور حقيقية من عمليات مجموعة ليك وGCCP وMERM دبي وLake Gas وليك أويل والمزيد.',
    'gallery.55': 'صور حقيقية'
  }
};

const actionShared = {
  en: {
    'index.action.lead': 'Depots, stations, LPG plants, and industrial sites across East Africa — swipe through live operations.',
    'index.action.all': 'All',
    'index.action.oil': 'Oil',
    'index.action.gas': 'Gas',
    'index.action.industry': 'Industry',
    'index.action.logistics': 'Logistics',
    'index.action.prev': 'Previous photo',
    'index.action.next': 'Next photo',
    'index.action.i01.t': 'Lake Oil Depot',
    'index.action.i01.s': 'Bulk petroleum terminal',
    'index.action.i02.t': 'Lake Energies Station',
    'index.action.i02.s': 'Retail fuel network',
    'index.action.i03.t': 'Depot Terminal',
    'index.action.i03.s': 'Storage & dispatch',
    'index.action.i04.t': 'Fleet Loading',
    'index.action.i04.s': 'Road tanker operations',
    'index.action.i05.t': 'Depot Aerial',
    'index.action.i05.s': 'East Africa footprint',
    'index.action.i06.t': 'Lake Gas',
    'index.action.i06.s': 'LPG infrastructure',
    'index.action.i07.t': 'Filling Plant',
    'index.action.i07.s': 'Cylinder bottling',
    'index.action.i08.t': 'Cylinder Yard',
    'index.action.i08.s': 'Ready for distribution',
    'index.action.i09.t': 'Plant Operations',
    'index.action.i09.s': 'Safety-first filling',
    'index.action.i10.t': 'LPG Warehouse',
    'index.action.i10.s': 'Bulk cylinder storage',
    'index.action.i11.t': 'Lake Steel',
    'index.action.i11.s': 'Hot rolling mill',
    'index.action.i12.t': 'HS-CR Rebars',
    'index.action.i12.s': 'Finished steel yard',
    'index.action.i13.t': 'Lake Lubes',
    'index.action.i13.s': 'Lubricant blending',
    'index.action.i14.t': 'Lake Plastics',
    'index.action.i14.s': 'Pipe manufacturing',
    'index.action.i15.t': 'Tanker Loading',
    'index.action.i15.s': 'Bulk haulage',
    'index.action.i16.t': 'Depot Fleet',
    'index.action.i16.s': 'Dispatch ready',
    'index.action.i17.t': 'Lake Trans',
    'index.action.i17.s': 'Fleet inspection',
    'index.action.i18.t': 'Energies Tanker',
    'index.action.i18.s': 'On-road delivery'
  },
  fr: {
    'index.action.lead': 'Dépôts, stations, usines GPL et sites industriels à travers l\'Afrique de l\'Est — parcourez les opérations en direct.',
    'index.action.all': 'Tous',
    'index.action.oil': 'Pétrole',
    'index.action.gas': 'Gaz',
    'index.action.industry': 'Industrie',
    'index.action.logistics': 'Logistique',
    'index.action.prev': 'Photo précédente',
    'index.action.next': 'Photo suivante',
    'index.action.i01.t': 'Dépôt Lake Oil',
    'index.action.i01.s': 'Terminal pétrolier en vrac',
    'index.action.i02.t': 'Station Lake Energies',
    'index.action.i02.s': 'Réseau de carburant de détail',
    'index.action.i03.t': 'Terminal de dépôt',
    'index.action.i03.s': 'Stockage et expédition',
    'index.action.i04.t': 'Chargement de flotte',
    'index.action.i04.s': 'Opérations de camions-citernes',
    'index.action.i05.t': 'Dépôt aérien',
    'index.action.i05.s': 'Empreinte en Afrique de l\'Est',
    'index.action.i06.t': 'Lake Gas',
    'index.action.i06.s': 'Infrastructure GPL',
    'index.action.i07.t': 'Usine de remplissage',
    'index.action.i07.s': 'Embouteillage de bouteilles',
    'index.action.i08.t': 'Parc de bouteilles',
    'index.action.i08.s': 'Prêt pour la distribution',
    'index.action.i09.t': 'Opérations d\'usine',
    'index.action.i09.s': 'Remplissage axé sur la sécurité',
    'index.action.i10.t': 'Entrepôt GPL',
    'index.action.i10.s': 'Stockage de bouteilles en vrac',
    'index.action.i11.t': 'Lake Steel',
    'index.action.i11.s': 'Laminoir à chaud',
    'index.action.i12.t': 'Barres HS-CR',
    'index.action.i12.s': 'Parc d\'acier fini',
    'index.action.i13.t': 'Lake Lubes',
    'index.action.i13.s': 'Mélange de lubrifiants',
    'index.action.i14.t': 'Lake Plastics',
    'index.action.i14.s': 'Fabrication de tuyaux',
    'index.action.i15.t': 'Chargement de citerne',
    'index.action.i15.s': 'Transport en vrac',
    'index.action.i16.t': 'Flotte du dépôt',
    'index.action.i16.s': 'Prêt pour l\'expédition',
    'index.action.i17.t': 'Lake Trans',
    'index.action.i17.s': 'Inspection de flotte',
    'index.action.i18.t': 'Citerne Energies',
    'index.action.i18.s': 'Livraison sur route'
  },
  sw: {
    'index.action.lead': 'Depo, vituo, mitambo ya LPG na maeneo ya viwanda Afrika Mashariki — telezesha kupitia shughuli hai.',
    'index.action.all': 'Zote',
    'index.action.oil': 'Mafuta',
    'index.action.gas': 'Gesi',
    'index.action.industry': 'Viwanda',
    'index.action.logistics': 'Usafirishaji',
    'index.action.prev': 'Picha iliyotangulia',
    'index.action.next': 'Picha inayofuata',
    'index.action.i01.t': 'Depo ya Lake Oil',
    'index.action.i01.s': 'Kituo cha mafuta kwa wingi',
    'index.action.i02.t': 'Kituo cha Lake Energies',
    'index.action.i02.s': 'Mtandao wa mafuta wa rejareja',
    'index.action.i03.t': 'Kituo cha Depo',
    'index.action.i03.s': 'Uhifadhi na usambazaji',
    'index.action.i04.t': 'Upakiaji wa Magari',
    'index.action.i04.s': 'Shughuli za malori ya mafuta',
    'index.action.i05.t': 'Depo kutoka Anga',
    'index.action.i05.s': 'Uwepo Afrika Mashariki',
    'index.action.i06.t': 'Lake Gas',
    'index.action.i06.s': 'Miundombinu ya LPG',
    'index.action.i07.t': 'Kiwanda cha Kujaza',
    'index.action.i07.s': 'Ujazaji wa mitungi',
    'index.action.i08.t': 'Uwanja wa Mitungi',
    'index.action.i08.s': 'Tayari kwa usambazaji',
    'index.action.i09.t': 'Shughuli za Kiwanda',
    'index.action.i09.s': 'Ujazaji salama kwanza',
    'index.action.i10.t': 'Ghala la LPG',
    'index.action.i10.s': 'Uhifadhi wa mitungi kwa wingi',
    'index.action.i11.t': 'Lake Steel',
    'index.action.i11.s': 'Kiandaa cha chuma cha moto',
    'index.action.i12.t': 'Fito za HS-CR',
    'index.action.i12.s': 'Uwanja wa chuma kilichokamilika',
    'index.action.i13.t': 'Lake Lubes',
    'index.action.i13.s': 'Uchanganyaji wa vilainishi',
    'index.action.i14.t': 'Lake Plastics',
    'index.action.i14.s': 'Utengenezaji wa mabomba',
    'index.action.i15.t': 'Upakiaji wa Tanki',
    'index.action.i15.s': 'Usafirishaji kwa wingi',
    'index.action.i16.t': 'Magari ya Depo',
    'index.action.i16.s': 'Tayari kwa usambazaji',
    'index.action.i17.t': 'Lake Trans',
    'index.action.i17.s': 'Ukaguzi wa magari',
    'index.action.i18.t': 'Tanki la Energies',
    'index.action.i18.s': 'Uwasilishaji barabarani'
  },
  hi: {
    'index.action.lead': 'पूर्वी अफ्रीका में डिपो, स्टेशन, LPG संयंत्र और औद्योगिक स्थल — लाइव संचालन देखें।',
    'index.action.all': 'सभी',
    'index.action.oil': 'तेल',
    'index.action.gas': 'गैस',
    'index.action.industry': 'उद्योग',
    'index.action.logistics': 'लॉजिस्टिक्स',
    'index.action.prev': 'पिछली तस्वीर',
    'index.action.next': 'अगली तस्वीर',
    'index.action.i01.t': 'लेक ऑयल डिपो',
    'index.action.i01.s': 'थोक पेट्रोलियम टर्मिनल',
    'index.action.i02.t': 'लेक एनर्जीज़ स्टेशन',
    'index.action.i02.s': 'खुदरा ईंधन नेटवर्क',
    'index.action.i03.t': 'डिपो टर्मिनल',
    'index.action.i03.s': 'भंडारण और प्रेषण',
    'index.action.i04.t': 'बेड़े की लोडिंग',
    'index.action.i04.s': 'रोड टैंकर संचालन',
    'index.action.i05.t': 'डिपो एरियल',
    'index.action.i05.s': 'पूर्वी अफ्रीका उपस्थिति',
    'index.action.i06.t': 'लेक गैस',
    'index.action.i06.s': 'LPG अवसंरचना',
    'index.action.i07.t': 'फिलिंग प्लांट',
    'index.action.i07.s': 'सिलेंडर बॉटलिंग',
    'index.action.i08.t': 'सिलेंडर यार्ड',
    'index.action.i08.s': 'वितरण के लिए तैयार',
    'index.action.i09.t': 'प्लांट संचालन',
    'index.action.i09.s': 'सुरक्षा-प्रथम फिलिंग',
    'index.action.i10.t': 'LPG वेयरहाउस',
    'index.action.i10.s': 'थोक सिलेंडर भंडारण',
    'index.action.i11.t': 'लेक स्टील',
    'index.action.i11.s': 'हॉट रोलिंग मिल',
    'index.action.i12.t': 'HS-CR रीबार',
    'index.action.i12.s': 'तैयार इस्पात यार्ड',
    'index.action.i13.t': 'लेक ल्यूब्स',
    'index.action.i13.s': 'लुब्रिकेंट ब्लेंडिंग',
    'index.action.i14.t': 'लेक प्लास्टिक्स',
    'index.action.i14.s': 'पाइप निर्माण',
    'index.action.i15.t': 'टैंकर लोडिंग',
    'index.action.i15.s': 'थोक परिवहन',
    'index.action.i16.t': 'डिपो बेड़ा',
    'index.action.i16.s': 'प्रेषण हेतु तैयार',
    'index.action.i17.t': 'लेक ट्रांस',
    'index.action.i17.s': 'बेड़ा निरीक्षण',
    'index.action.i18.t': 'एनर्जीज़ टैंकर',
    'index.action.i18.s': 'सड़क पर डिलीवरी'
  },
  ar: {
    'index.action.lead': 'مستودعات ومحطات ومصانع غاز و مواقع صناعية عبر شرق أفريقيا — استعرض العمليات المباشرة.',
    'index.action.all': 'الكل',
    'index.action.oil': 'نفط',
    'index.action.gas': 'غاز',
    'index.action.industry': 'صناعة',
    'index.action.logistics': 'لوجستيات',
    'index.action.prev': 'الصورة السابقة',
    'index.action.next': 'الصورة التالية',
    'index.action.i01.t': 'مستودع ليك أويل',
    'index.action.i01.s': 'محطة نفط سائبة',
    'index.action.i02.t': 'محطة ليك إنرجيز',
    'index.action.i02.s': 'شبكة وقود للتجزئة',
    'index.action.i03.t': 'محطة المستودع',
    'index.action.i03.s': 'تخزين وإرسال',
    'index.action.i04.t': 'تحميل الأسطول',
    'index.action.i04.s': 'عمليات شاحنات الصهاريج',
    'index.action.i05.t': 'مستودع جوي',
    'index.action.i05.s': 'انتشار شرق أفريقيا',
    'index.action.i06.t': 'ليك غاز',
    'index.action.i06.s': 'بنية تحتية لغاز LPG',
    'index.action.i07.t': 'مصنع التعبئة',
    'index.action.i07.s': 'تعبئة الأسطوانات',
    'index.action.i08.t': 'ساحة الأسطوانات',
    'index.action.i08.s': 'جاهزة للتوزيع',
    'index.action.i09.t': 'عمليات المصنع',
    'index.action.i09.s': 'تعبئة بالسلامة أولاً',
    'index.action.i10.t': 'مستودع LPG',
    'index.action.i10.s': 'تخزين أسطوانات بالجملة',
    'index.action.i11.t': 'ليك ستيل',
    'index.action.i11.s': 'مطحنة الدرفلة الساخنة',
    'index.action.i12.t': 'قضبان HS-CR',
    'index.action.i12.s': 'ساحة الصلب الجاهز',
    'index.action.i13.t': 'ليك لوبز',
    'index.action.i13.s': 'خلط مواد التشحيم',
    'index.action.i14.t': 'ليك بلاستيكس',
    'index.action.i14.s': 'تصنيع الأنابيب',
    'index.action.i15.t': 'تحميل الصهريج',
    'index.action.i15.s': 'نقل بالجملة',
    'index.action.i16.t': 'أسطول المستودع',
    'index.action.i16.s': 'جاهز للإرسال',
    'index.action.i17.t': 'ليك ترانس',
    'index.action.i17.s': 'فحص الأسطول',
    'index.action.i18.t': 'صهريج إنرجيز',
    'index.action.i18.s': 'توصيل على الطريق'
  }
};

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const langs = ['en', 'fr', 'sw', 'hi', 'ar'];
let changed = 0;

for (const lang of langs) {
  if (!data[lang]) data[lang] = {};
  const packs = [galleryUpdates[lang], actionShared[lang]];
  for (const pack of packs) {
    for (const [k, v] of Object.entries(pack)) {
      if (data[lang][k] !== v) {
        data[lang][k] = v;
        changed += 1;
      }
    }
  }
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n', 'utf8');

if (fs.existsSync(MASTER_PATH)) {
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  Object.assign(master, galleryUpdates.en, actionShared.en);
  fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2) + '\n', 'utf8');
}

console.log('Updated', changed, 'key/lang values; regenerated i18n-content.js');
