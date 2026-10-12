/* Lake Group Assistant V2 — local, deterministic, approved-content only. */
(function () {
  'use strict';
  if (window.LakeAssistantV2 || window.LAKE_ASSISTANT_ENABLED === false) return;
  var refs = {}, index, assets, companies = [], kbMetadata = null, welcomeTimer = null, welcomeTyping = null, welcomeText = '', welcomeToken = 0, hasWelcomed = false, activeChatController = null, chatStreamActive = false, chatStreamFollow = true, latestResponseArticle = null, speechState = null, voiceState = { stream: null, pcmChunks: [], pcmSamples: 0, pcmSampleRate: 0, captureContext: null, captureSource: null, captureProcessor: null, captureGain: null, partialTimer: null, partialPromise: null, partialController: null, partialCursor: 0, timer: null, counterTimer: null, recordingStartedAt: 0, meterContext: null, meterSource: null, meterAnalyser: null, meterFrame: 0, meterLevel: 0, controller: null, mode: '', session: 0, active: false, pending: false, localReady: false, healthTimer: null, healthFailures: 0, sendAfterTranscript: false, finalText: '', detectedLanguage: '', baseText: '', submitted: false, locale: 'en-US' };
  var groupEntity = { name: 'Lake Group', route: 'about.html', aliases: ['Lake Group', 'Lake Oil Group'] };
  var routes = {
    CONTACT: ['contact.html', 'Contact Lake Group'], CAREERS: ['careers.html', 'Careers at Lake Group'],
    STATIONS: ['station-locator.html', 'Station locator'], COUNTRIES: ['about.html', 'Where Lake Group operates'],
    SUSTAINABILITY: ['csr.html', 'CSR & sustainability'], HISTORY: ['history.html', 'Lake Group history'],
    LEADERSHIP: ['leadership.html', 'Lake Group leadership'], GROUP_COMPANIES: ['index.html', 'Lake Group companies']
  };
  var state = newConversationState();
  function page(){return location.pathname.split('/').pop()||'index.html';} function lang(){return window.LakeI18n&&window.LakeI18n.current||'en';}
  var TOKEN_ALIASES={lak:'lake',stel:'steel',locatons:'location',locaton:'location',locatoin:'location',adress:'address',adrees:'address',addreses:'address',headquaters:'headquarters',subsidaries:'subsidiary',subsidarys:'subsidiary',bussiness:'business',buisness:'business',operatons:'operation',statons:'station',prodcuts:'product',produts:'product',servce:'service',carear:'career',officies:'office',branche:'branch',cntact:'contact'};
  var TOKEN_FORMS={locations:'location',located:'locate',addresses:'address',offices:'office',branches:'branch',stations:'station',countries:'country',regions:'region',markets:'market',subsidiaries:'subsidiary',companies:'company',businesses:'business',products:'product',services:'service',careers:'career',jobs:'job',operations:'operation',facilities:'facility',directions:'direction',dealers:'dealer',dealerships:'dealer',certificates:'certificate',licenses:'license',licences:'licence',phones:'phone',telephones:'telephone',emails:'email',contacts:'contact',calls:'call',leaders:'leader',directors:'director',founders:'founder',executives:'executive',managers:'manager',vacancies:'vacancy',recruiters:'recruiter',announcements:'announcement',airports:'airport',ports:'port',terminals:'terminal',headquarters:'headquarters'};
  function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  var correctionWords=[];
  function editDistance(a,b){if(Math.abs(a.length-b.length)>2)return 3;var prev=[],curr=[],before=[];for(var j=0;j<=b.length;j++)prev[j]=j;for(var i=1;i<=a.length;i++){curr[0]=i;for(j=1;j<=b.length;j++){curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));if(i>1&&j>1&&a.charAt(i-1)===b.charAt(j-2)&&a.charAt(i-2)===b.charAt(j-1))curr[j]=Math.min(curr[j],(before[j-2]||0)+1);}before=prev;prev=curr;curr=[];}return prev[b.length];}
  function correctToken(token){if(TOKEN_ALIASES[token])return TOKEN_ALIASES[token];if(TOKEN_FORMS[token])return TOKEN_FORMS[token];if(token.length<5||!correctionWords.length||correctionWords.indexOf(token)>-1)return token;var limit=token.length>=6?2:1,best=limit+1,candidate=null,tied=false;correctionWords.forEach(function(word){if(Math.abs(word.length-token.length)>limit)return;var distance=editDistance(token,word);if(distance<best){best=distance;candidate=word;tied=false;}else if(distance===best&&word!==candidate)tied=true;});return best<=limit&&!tied?candidate:token;}
  function normalizedTokens(s){return norm(s).split(' ').filter(Boolean).map(correctToken);}
  var STOP_WORDS=/^(a|an|the|is|are|do|does|what|where|when|why|who|how|can|could|would|i|we|you|about|tell|me|more|detail|of|to|for|in|on|at|and|their|they|them|it|its|there|that|this|offer|provide|give|group|please|lake|your|our|us|was|were|be|being|which|with|from)$/;
  function words(s){return normalizedTokens(s).filter(function(w){return w.length>1&&!STOP_WORDS.test(w);});}
  function newConversationState(){return{currentEntity:null,currentIntent:null,currentTopic:null,previousQuery:'',previousResultIds:[],recentQuestions:[],recentVariants:{},variantCursor:{},currentPage:page(),language:lang()};}
  function findEntity(q){var n=' '+normalizedTokens(q).join(' ')+' ',matches=[];if(/\blake oil group\b/.test(n))return groupEntity;companies.forEach(function(company){(company.aliases||[company.name]).forEach(function(alias){var a=normalizedTokens(alias).join(' ');if(a.length>2&&n.indexOf(' '+a+' ')>-1)matches.push({company:company,length:a.length});});});matches.sort(function(a,b){return b.length-a.length;});if(!matches.length)return/\b(lake group|the group)\b/.test(n)?groupEntity:null;var longest=matches.filter(function(m){return m.length===matches[0].length;});var unique=[];longest.forEach(function(m){if(!unique.some(function(x){return x.route===m.company.route;}))unique.push(m.company);});return unique.length===1?unique[0]:{ambiguous:true,companies:unique};}
  var INTENT_REGISTRY=[
    {intent:'GROUP_COMPANIES',terms:['subsidiary','subsidiaries','company list','group companies','business vertical','business verticals','companies','businesses under','group business']},
    {intent:'STATIONS',terms:['petrol station','fuel station','station locator','nearest station','nearest fuel','station','dealer']},
    {intent:'COUNTRIES',terms:['countries of operation','where do you operate','where does lake group operate','country of operation','countries','country','markets','regions','operate','operation']},
    {intent:'CAREERS',terms:['job','career','apply','vacancy','vacancies','recruit','recruitment','employment']},
    {intent:'SUSTAINABILITY',terms:['sustainability','sustainable','environment','clean cooking','csr','community','communities']},
    {intent:'LEADERSHIP',terms:['leader','leadership','chairman','ceo','founder','director','management']},
    {intent:'HISTORY',terms:['history','founded','founding','established','started','timeline']},
    {intent:'NEWS',terms:['news','media','press','announcement']},
    {intent:'PRODUCT_INFO',terms:['product','manufacture','make','produce','model','range']},
    {intent:'SERVICE_INFO',terms:['service','provide','business','offer','capability','solution']},
    {intent:'LOCATION',terms:['headquarters','headquarter','head office','head offices','hq','location','where','locate','address','office','branch','based','direction','airport','port','facility']},
    {intent:'CONTACT',terms:['contact','phone','telephone','email','call','reach']},
    {intent:'MORE_INFO',terms:['tell me more','more detail','more about','elaborate','expand on','in detail','detailed','more']},
    {intent:'COMPANY_INFO',terms:['tell me about','who is','what is','about','company']}
  ];
  function registryMatch(q){var tokens=normalizedTokens(q),normalized=' '+tokens.join(' ')+' ',winner=null;function matches(intentName){var entry=INTENT_REGISTRY.find(function(item){return item.intent===intentName;});return entry&&entry.terms.some(function(term){return normalized.indexOf(' '+normalizedTokens(term).join(' ')+' ')>-1;});}if(matches('STATIONS'))return'STATIONS';if(matches('COUNTRIES'))return'COUNTRIES';if(['headquarters','headquarter','head office','head offices','hq','location','where','locate','address','office','branch','based','direction','airport','port','facility'].some(function(term){return normalized.indexOf(' '+normalizedTokens(term).join(' ')+' ')>-1;}))return'LOCATION';INTENT_REGISTRY.forEach(function(entry,order){entry.terms.forEach(function(term){var phrase=' '+normalizedTokens(term).join(' ')+' ';if(normalized.indexOf(phrase)<0)return;var candidate={intent:entry.intent,order:order};if(!winner||candidate.order<winner.order)winner=candidate;});});return winner&&winner.intent;}
  function intent(q,e){var n=norm(q),only=normalizedTokens(q).join(' ');if(/^(bye|goodbye|good bye|see you|talk to you later|kwaheri)[!,. ]*$/.test(n))return'GOODBYE';if(/^(hi|hello|hey|good morning|good afternoon|good evening|jambo|habari)( again)?[!,. ]*$/.test(n))return'GREETING';if(/\b(thanks?|thank you|asante|merci|gracias)\b/i.test(n))return'THANKS';if(/\b(help|what can you|how can you)\b/i.test(n))return'HELP';if(/^(why|why is that|why are they|why does it|why do they)$/.test(only)||/\b(clarify|what do you mean|which one|can you explain that)\b/i.test(n))return'CLARIFICATION';if(/^(what|which|how)$/.test(only)||only==='more'&&!e)return'CLARIFICATION';var match=registryMatch(q);if(match)return match;if(e)return'COMPANY_INFO';return'UNKNOWN';}
  function hasPronounReference(q){return/\b(it|they|them|their|its|there|those|that)\b|^(and|also|what about)\b/i.test(q);}
  function isGroupReference(q){return/\b(lake group|lake oil group|the group|group wide|group-wide)\b/i.test(q);}
  function usesRecentContext(q,i){var tokens=words(q);return!!state.currentEntity&&(hasPronounReference(q)||tokens.length<=3||i==='MORE_INFO'||/^what about\b/i.test(q));}
  function chooseVariant(key,options){var used=state.recentVariants[key]||[],cursor=state.variantCursor[key]||0,chosen=null;for(var i=0;i<options.length;i++){var position=(cursor+i)%options.length;if(used.indexOf(position)<0){chosen=position;break;}}if(chosen===null)chosen=cursor%options.length;state.variantCursor[key]=(chosen+1)%options.length;state.recentVariants[key]=(used.concat(chosen)).slice(-2);return options[chosen];}
  function script(src){return new Promise(function(done){var s=document.createElement('script');s.src=src;s.async=true;s.onload=s.onerror=done;document.head.appendChild(s);});}
  function knowledge(){if(assets)return assets;assets=Promise.resolve().then(function(){return window.FlexSearch?null:script('assets/vendor/flexsearch/flexsearch.bundle.min.js');}).then(function(){return window.__LAKE_ASSISTANT_KB__?null:script('assets/assistant-kb.js');}).then(function(){var kb=window.__LAKE_ASSISTANT_KB__,pack=kb&&kb.langs&&(kb.langs[lang()]||kb.langs.en),docs=pack&&pack.docs||[];kbMetadata=kb||null;companies=kb&&kb.entities||[];var lexicon=[];INTENT_REGISTRY.forEach(function(entry){entry.terms.forEach(function(term){lexicon=lexicon.concat(norm(term).split(' '));});});companies.forEach(function(company){(company.aliases||[company.name]).forEach(function(alias){lexicon=lexicon.concat(norm(alias).split(' '));});});correctionWords=[...new Set(lexicon.filter(function(word){return word.length>=4;}))];index={docs:docs,flex:window.FlexSearch&&new window.FlexSearch.Index({tokenize:'forward',charset:'latin:simple'})};if(index.flex)docs.forEach(function(d,i){index.flex.add(i,[d.title||d.t,d.entity,(d.aliases||[]).join(' '),d.keywords||d.k,d.text||d.s].join(' '));});return index;});return assets;}
  function entity(q){var found=findEntity(q);if(found)return found;return usesRecentContext(q,intent(q,null))?state.currentEntity:null;}
  function categoryFor(i){return{CONTACT:'contact',CAREERS:'careers',STATIONS:'stations',COUNTRIES:'locations',LOCATION:'locations',SUSTAINABILITY:'sustainability',LEADERSHIP:'leadership',HISTORY:'history',PRODUCT_INFO:'products',SERVICE_INFO:'services',COMPANY_INFO:'overview',MORE_INFO:state.currentTopic}[i]||null;}
  function isLocationEvidence(d){var title=norm(d.title||d.t),text=norm(d.text||d.s);if(d.page==='contact.html'&&/group headquarters|contact lake group/.test(title))return true;if(/operating locations|headquarters|office address|company address/.test(title))return true;var place=/\b(tanzania|kenya|zambia|congo|rwanda|burundi|ethiopia|mozambique|uganda|dubai|dar es salaam|kigamboni|kibaha|mikocheni|mwanza|arusha|dodoma|morogoro|iringa|mbeya|enk?tebbe|entebbe|kilimanjaro|nairobi|ndola|maputo|kampala|jro|dar|znz|ebb)\b/.test(text);return place&&/\b(locat|based|headquarter|address|operat|presence|across|facility|facilities|terminal|airport|depot|branch|office|station|region)\w*\b/.test(text);}
  function locationRecord(e,q){if(!index)return null;var route=e&&e!==groupEntity?e.route:null,docs=index.docs;if(!route){var headquarters=docs.find(function(d){return d.factType==='headquarters'&&d.page==='contact.html'&&d.verification==='PUBLISHED'&&/\b(plots?|road|street|avenue|address)\b/i.test(d.evidenceText||d.text||d.s);});return headquarters||null;}var matches=docs.filter(function(d){return d.page===route&&isLocationEvidence(d);});if(!matches.length)return null;matches.sort(function(a,b){return score(b,q,'LOCATION',e)-score(a,q,'LOCATION',e);});return matches[0];}
  function groupCountriesRecord(){return index&&index.docs.find(function(d){return d.page==='our-story.html'&&/^across 10 countries and counting/.test(norm(d.title||d.t))&&/tanzania.*kenya.*zambia.*rwanda.*burundi.*congo.*ethiopia.*mozambique.*uganda.*uae/i.test(d.text||d.s);})||null;}
  function broadLocationQuestion(q){return normalizedTokens(q).filter(function(w){return !STOP_WORDS.test(w)&&!(/^(company|lake|group|you|your|we|our)$/.test(w));}).length<=1;}
  function score(d,q,i,e){var title=norm(d.title||d.t),text=norm(d.text||d.s),terms=words(q),score=0,route=e&&e.route,category=categoryFor(i),topicRoute=routes[i]&&routes[i][0],productEvidence=/\b(tmt|reinforcement bars?|steel bars?|pipes?|cylinders?|lpg|cement|gypsum boards?|lubricants?|vehicles?|aggregates?)\b/i.test(d.text||d.s);if(i==='GROUP_COMPANIES'&&d.id==='directory:companies')score+=120;if(e===groupEntity){if(d.entityType==='company')score-=85;if(i==='COMPANY_INFO'&&d.page==='about.html')score+=35;}else if(e){if(d.page===route)score+=75;else if(d.entityType==='group')score-=30;else score-=85;}else if(d.entityType==='company'&&i!=='GROUP_COMPANIES')score-=15;if(!e&&topicRoute&&d.page===topicRoute)score+=55;if(e&&e!==groupEntity&&i==='COMPANY_INFO'&&d.page===route)score+=Math.max(0,100-(Number(d.ordinal)||0)*12);if(i==='PRODUCT_INFO'){if(productEvidence)score+=28;else if(/capacity|rolling mill|quality testing|raw material|production process/i.test(d.text||d.s))score-=12;}if(i==='CONTACT'&&/headquarters|group address/i.test(d.title||d.t)&&/phone|email|address|dar es salaam/i.test(d.text||d.s))score+=24;if(i==='STATIONS'&&/how many|number of|count/i.test(q)&&/\d/.test(d.title||d.t))score+=30;if(category){score+=d.category===category?38:0;if(category==='products'&&/products|manufactur|produce/.test(d.category||''))score+=12;if(category==='locations'&&/location|station/.test(d.category||''))score+=10;}terms.forEach(function(word){if(title.indexOf(word)>-1)score+=12;if(norm(d.keywords||d.k).indexOf(word)>-1)score+=6;if(text.indexOf(word)>-1)score+=3;});score+=(Number(d.priority)||0)/20;if(d.verification==='VERIFIED'||d.f===1)score+=3;return score;}
  function retrieve(q,i,e,more){if(!index)return null;var terms=words(q),category=categoryFor(i),specific=norm(q).match(/\b(certification|certificate|licence|license|permit|accreditation|capacity|tonnage|registration)\b/g)||[],all=index.docs,ranked=all.map(function(d){var corpus=norm((d.title||d.t)+' '+(d.keywords||d.k)+' '+(d.text||d.s)),overlap=terms.some(function(w){return corpus.indexOf(w)>-1;}),supportedSpecific=specific.every(function(w){return corpus.indexOf(w)>-1;});return{d:d,s:score(d,q,i,e),overlap:overlap,supportedSpecific:supportedSpecific};}).filter(function(item){return item.s>0&&item.supportedSpecific;}).sort(function(a,b){return b.s-a.s;});if(more)ranked=ranked.filter(function(item){return state.previousResultIds.indexOf(item.d.id)<0;});var best=ranked[0];if(e&&best&&!best.overlap&&!(terms.length===0&&category&&best.d.category===category))return null;return best&&best.s>=(e?25:14)?best.d:null;}
  function quick(){return[];}
  function snippets(text,query,category,detailed){var sentences=String(text||'').match(/[^.!?]+[.!?]?/g)||[],terms=words(query),ranked=sentences.map(function(s,n){var value=norm(s),score=0;terms.forEach(function(w){if(value.indexOf(w)>-1)score+=2;});if(category==='products'&&/product|manufactur|produce|pipe|steel|range|model|cylinder|board|concrete|vehicle/i.test(s))score+=3;if(category==='services'&&/service|provide|supply|logistic|transport|operation|solution|capabilit/i.test(s))score+=3;if(category==='locations'&&/located|based|location|Tanzania|Kenya|Uganda|Zambia|Dar es Salaam|Kibaha|airport|port/i.test(s))score+=3;return{s:String(s).trim(),n:n,score:score};}).filter(function(x){return x.s.length>28;}).sort(function(a,b){return b.score-a.score||a.n-b.n;});var chosen=ranked.slice(0,detailed?3:2).sort(function(a,b){return a.n-b.n;}).map(function(x){return x.s;});var result=chosen.join(' ').replace(/\s+/g,' ').trim();if(result.length>380)result=result.slice(0,377).replace(/\s+\S*$/,'')+'…';return result;}
  var variants={GREETING:['Hi! What would you like to know about Lake Group?','Hello! I can help you find information across Lake Group. What are you looking for?','Hey there — what can I help you look up today?','Welcome! Ask me about our companies, products, services or operations.','Good to hear from you. What would you like to explore?','Hello again! What would you like to know?','Hi there. Which part of Lake Group can I help with?','Hey! I’m here to help you find information on Lake Group.','Welcome back. What can I look up for you?','Good day! What Lake Group information are you looking for?','Jambo! What would you like to know about Lake Group?','Hello — tell me what you’re looking for and I’ll find the published information.'],THANKS:['You’re welcome. What else can I help you find?','Glad I could help. Is there anything else you’d like to know?','Anytime. What would you like to look into next?'],GOODBYE:['Goodbye — come back any time you need information about Lake Group.','Take care. I’ll be here if you have another question.','See you next time!'],HELP:['Of course. Ask me about Lake Group companies, products, services, locations, careers or published initiatives.','I can help look up company information, products, services, operations, careers and contact details. What do you need?','Sure — tell me which Lake Group topic or company you’re interested in.'],CLARIFICATION:['Could you tell me which Lake Group company or topic you mean?','I’m not certain which company you’re referring to. Which one should I check?','Can you give me a little more context so I can find the right published information?'],UNKNOWN:["I'm not seeing a confirmed answer for that. You can check the relevant Lake Group page for more details.","I couldn't verify that from the published information I have. The Lake Group website may have more detail.","I don't have a confirmed published answer for that yet. Please check the relevant Lake Group page."],FACT:['','The current page notes: ','Lake Group’s published information says: ','According to the current Lake Group page: '],MORE_INFO:['Here’s a little more: ','A further detail: ','The page also notes: ']};
  function compose(q,i,e){if(i==='GREETING'||i==='THANKS'||i==='GOODBYE'||i==='HELP')return{text:chooseVariant(i,variants[i]),actions:quick()};if(i==='CLARIFICATION'){if(/^why\b/i.test(q)){var subject=e&&e.name||state.currentEntity&&state.currentEntity.name;return{text:subject?'What would you like to know why about '+subject+'? Tell me which part you mean, and I’ll look for the published information.':'What would you like to know why about? Tell me the Lake Group topic or company and I’ll find the relevant published information.'};}return{text:chooseVariant(i,variants[i]),actions:quick()};}if(i==='UNKNOWN'&&!e)return{text:chooseVariant('UNKNOWN',variants.UNKNOWN),nomatch:true};var more=i==='MORE_INFO',effectiveIntent=more&&state.currentIntent?state.currentIntent:i,category=categoryFor(effectiveIntent),d=effectiveIntent==='LOCATION'?locationRecord(e,q):effectiveIntent==='COUNTRIES'&&(!e||e===groupEntity)?groupCountriesRecord():retrieve(q,effectiveIntent,e,more);if(!d&&more)d=retrieve(state.previousQuery,effectiveIntent,e,false);if(!d&&effectiveIntent==='LOCATION'&&e&&e!==groupEntity)return{text:'I couldn’t find a published location for '+e.name+' in its current company information. Its profile is here:',links:[{u:e.route,t:e.name}],nomatch:false};if(!d)return{text:chooseVariant('UNKNOWN',variants.UNKNOWN),nomatch:true};if(effectiveIntent==='COUNTRIES'&&(!e||e===groupEntity))return{text:'Lake Group’s published Our Story page lists these 10 countries: '+String(d.text||d.s).trim()+'.',links:[{u:d.page||d.u,t:d.title||d.t||'Lake Group operations'}],id:d.id};if(effectiveIntent==='LOCATION'&&(!e||e===groupEntity)&&broadLocationQuestion(q)){var address=String(d.text||d.s||'').trim();return{text:'Lake Group’s headquarters is at '+address+'. Are you looking for headquarters, a company office, fuel stations, or countries where we operate?',links:[{u:d.page||d.u||'contact.html',t:d.title||d.t||'Group Headquarters'}],id:d.id};}var answer=snippets(d.text||d.s,q,category,more);if(effectiveIntent==='LOCATION'&&e&&e!==groupEntity)answer=String(d.text||d.s||'').trim();if(/how many|number of|what is the count/i.test(q)&&/\d/.test(d.title||d.t)&&/station|truck|country|employee|nationalit|capacity|litre|tonne/i.test(d.title||d.t))answer=d.title||d.t;if(!answer)answer=String(d.text||d.s||'').slice(0,240);var repeated=state.recentQuestions.some(function(item){return norm(item.query)===norm(q);});var prefix=chooseVariant(more?'MORE_INFO':'FACT',variants[more?'MORE_INFO':'FACT']);var result={text:prefix+answer,links:[{u:d.page||d.u||'index.html',t:d.title||d.t||'Lake Group information'}],id:d.id};if(repeated)result.text=chooseVariant('FACT',variants.FACT)+answer;return result;}
  function resolve(q){var explicit=findEntity(q),e=explicit&&explicit.ambiguous?null:explicit;if(!e&&usesRecentContext(q,intent(q,null)))e=state.currentEntity;var i=intent(q,e);if(explicit&&explicit.ambiguous)return{answer:{text:'I found more than one possible match. Which company did you mean?',nomatch:false},entity:null,intent:'CLARIFICATION'};if(!e&&hasPronounReference(q)&&state.currentEntity===null)return{answer:{text:chooseVariant('CLARIFICATION',variants.CLARIFICATION),nomatch:false},entity:null,intent:'CLARIFICATION'};if(i==='COMPANY_INFO'&&e===groupEntity){var overview=index.docs.find(function(d){return d.factType==='group-overview'&&d.verification==='PUBLISHED';});if(overview)return{answer:{text:overview.evidenceText||overview.text||overview.s,links:[{u:overview.page||overview.u,t:overview.title||overview.t||'Lake Group overview'}],id:overview.id},entity:e,intent:i};}if(!e&&(i==='PRODUCT_INFO'||i==='SERVICE_INFO'))return{answer:{text:'Which Lake Group company do you mean? I can check its published products or services.',nomatch:false},entity:null,intent:'CLARIFICATION'};return{answer:compose(q,i,e),entity:e,intent:i};}
  function remember(q,result){state.currentEntity=result.entity||((result.intent==='GREETING'||result.intent==='THANKS'||result.intent==='HELP')?state.currentEntity:null);state.currentIntent=result.intent;state.currentTopic=categoryFor(result.intent)||state.currentTopic;state.previousQuery=q;state.previousResultIds=result.answer.id?[result.answer.id]:[];state.recentQuestions.push({query:q,id:result.answer.id||null});state.recentQuestions=state.recentQuestions.slice(-12);}
  function reply(q){var result=resolve(q);remember(q,result);return result.answer;}
  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function uiIcon(kind) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (kind === 'chat') {
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('stroke-width', '2');
      var bubble = document.createElementNS(svg.namespaceURI, 'path');
      bubble.setAttribute('d', 'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.205 1.288l3.354-.994a2 2 0 0 1 1.099.092 10 10 0 1 0-4.687-4.843Z');
      svg.appendChild(bubble);
      for (var i = 0; i < 3; i++) {
        var dot = document.createElementNS(svg.namespaceURI, 'path');
        dot.setAttribute('class', 'la-launcher-dot la-launcher-dot-' + (i + 1));
        dot.setAttribute('d', 'M' + (8 + i * 4) + ' 12h.01');
        svg.appendChild(dot);
      }
    } else if (kind === 'close') {
      var x = document.createElementNS(svg.namespaceURI, 'path');
      x.setAttribute('d', 'm18 6-12 12M6 6l12 12');
      svg.appendChild(x);
    } else if (kind === 'mic') {
      var mic = document.createElementNS(svg.namespaceURI, 'path');
      mic.setAttribute('d', 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0m5 5v3m-4 0h8');
      svg.appendChild(mic);
    } else if (kind === 'stop') {
      var stop = document.createElementNS(svg.namespaceURI, 'rect');
      stop.setAttribute('x', '7'); stop.setAttribute('y', '7'); stop.setAttribute('width', '10'); stop.setAttribute('height', '10'); stop.setAttribute('rx', '2');
      svg.appendChild(stop);
    } else if (kind === 'copy') {
      var copyPath = document.createElementNS(svg.namespaceURI, 'path'); copyPath.setAttribute('d', 'M8 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M6 8h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z'); svg.appendChild(copyPath);
    } else if (kind === 'edit') {
      var editPath = document.createElementNS(svg.namespaceURI, 'path'); editPath.setAttribute('d', 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z'); svg.appendChild(editPath);
    } else if (kind === 'share') {
      var sharePath = document.createElementNS(svg.namespaceURI, 'path'); sharePath.setAttribute('d', 'M12 16V3m0 0L7 8m5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'); svg.appendChild(sharePath);
    } else if (kind === 'speaker') {
      var speakerPath = document.createElementNS(svg.namespaceURI, 'path'); speakerPath.setAttribute('d', 'M11 5 6 9H3v6h3l5 4V5Zm4 3a5 5 0 0 1 0 8m2-11a9 9 0 0 1 0 14'); svg.appendChild(speakerPath);
    } else if (kind === 'regenerate') {
      var regeneratePath = document.createElementNS(svg.namespaceURI, 'path'); regeneratePath.setAttribute('d', 'M20 7v5h-5M4 17v-5h5m10-1a7 7 0 0 0-12-4L4 9m16 6-3 2a7 7 0 0 1-12-4'); svg.appendChild(regeneratePath);
    } else if (kind === 'thumb-up') {
      var thumbUp = document.createElementNS(svg.namespaceURI, 'path'); thumbUp.setAttribute('d', 'M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 5-8c2 0 3 2 2 4l-1 4h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7'); svg.appendChild(thumbUp);
    } else if (kind === 'thumb-down') {
      var thumbDown = document.createElementNS(svg.namespaceURI, 'path'); thumbDown.setAttribute('d', 'M7 14V3H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3Zm0 0 5 8c2 0 3-2 2-4l-1-4h6a2 2 0 0 0 2-2l-2-7a2 2 0 0 0-2-2H7'); svg.appendChild(thumbDown);
    } else if (kind === 'check') {
      var checkPath = document.createElementNS(svg.namespaceURI, 'path'); checkPath.setAttribute('d', 'm5 12 4 4L19 6'); svg.appendChild(checkPath);
    } else {
      var arrow = document.createElementNS(svg.namespaceURI, 'path');
      arrow.setAttribute('d', 'M12 19V5m-6 6 6-6 6 6');
      svg.appendChild(arrow);
    }
    return svg;
  }
  function safeAnswerText(value) {
    return String(value || '')
      .replace(/\[([^\]]+)\]\(https:\/\/www\.lakeoilgroup\.com(?:\/[^)\s]*)?\)/gi, '$1')
      .replace(/https:\/\/www\.lakeoilgroup\.com(?:\/[^\s)\]<>]*)?/gi, '')
      .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function appendSources(article, links) {
    var seenSources = Object.create(null);
    (links || []).forEach(function (link) {
      if (!link || !link.u || seenSources[link.u]) return;
      seenSources[link.u] = true;
      var sources = node('div', 'la-links');
      var anchor = node('a', '', link.t);
      anchor.href = link.u;
      sources.appendChild(anchor);
      article.appendChild(sources);
    });
  }
  function messageUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
      var value = Math.random() * 16 | 0;
      return (character === 'x' ? value : (value & 3 | 8)).toString(16);
    });
  }
  function draw(message) {
    var isUser = message.role === 'user';
    if (isUser) refs.messages.classList.remove('is-welcome');
    var article = node('article', 'la-message la-' + (isUser ? 'user' : 'bot'));
    article.dataset.messageId = message.id || messageUuid();
    if (message.turnId) { article.dataset.turnId = message.turnId; article._turnId = message.turnId; }
    article._messageKind = message.kind || (message.type === 'error' ? 'error' : message.type === 'welcome' ? 'welcome' : 'assistant');
    var body = node('div', 'la-message-body');
    var messageText = isUser ? String(message.text || '').trim() : safeAnswerText(message.text);
    body.appendChild(node('p', '', messageText));
    article._messageBody = body;
    article._answerParagraph = body.firstChild;
    article._messageText = messageText;
    article.appendChild(body);
    appendSources(article, message.links);
    refs.messages.appendChild(article);
    if (isUser) addUserActions(article);
    else addResponseActions(article, message.text, message.locale, article._messageKind, message.turnId, message.questionArticle);
    refs.messages.scrollTop = refs.messages.scrollHeight;
    return article;
  }
  function streamArticle(text, turnId) {
    var article = node('article', 'la-message la-bot');
    article._messageKind = 'assistant';
    if (turnId) { article.dataset.turnId = turnId; article._turnId = turnId; }
    var body = node('div', 'la-message-body');
    var paragraph = node('p');
    paragraph.textContent = safeAnswerText(text);
    body.appendChild(paragraph);
    article.appendChild(body);
    article._messageBody = body;
    article._messageText = safeAnswerText(text);
    refs.messages.appendChild(article);
    article._answerParagraph = paragraph;
    return { article: article, paragraph: paragraph };
  }
  function responseAction(article, kind, label, extraClass) {
    var button = node('button', 'la-response-action' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button'; button.title = label; button.setAttribute('aria-label', label); button.appendChild(uiIcon(kind));
    article._actionBar.appendChild(button);
    return button;
  }
  function actionFeedback(article, text) {
    if (!article._actionFeedback) {
      article._actionFeedback = node('span', 'la-action-feedback');
      article._actionFeedback.setAttribute('role', 'status'); article._actionFeedback.setAttribute('aria-live', 'polite');
      article._actionBar.parentNode.appendChild(article._actionFeedback);
    }
    article._actionFeedback.textContent = text || '';
  }
  function setLatestResponse(article) {
    latestResponseArticle = article;
    if (article._regenerateButton) {
      article._regenerateButton.disabled = false;
      article._regenerateButton.title = 'Regenerate response';
      article._regenerateButton.setAttribute('aria-label', 'Regenerate response');
    }
  }
  function addResponseActions(article, answer, locale, kind, turnId, questionArticle) {
    if (!article || article._actionBar) return;
    kind = kind || 'assistant';
    article._responseText = safeAnswerText(answer);
    article._responseLocale = locale || (/\b(karibu|habari|asante|katika|kwa|ya|ni|naweza|shughuli|kampuni|nchini)\b/i.test(answer) ? 'sw' : 'en');
    var bar = node('div', 'la-response-actions');
    bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Assistant message actions');
    article._actionBar = bar;
    var copy = responseAction(article, 'copy', 'Copy message');
    var copyTimer = null;
    copy.addEventListener('click', function () {
      copyResponse(article._responseText).then(function () {
        copy.classList.add('is-active'); copy.replaceChildren(uiIcon('check')); copy.title = 'Copied'; copy.setAttribute('aria-label', 'Message copied');
        actionFeedback(article, 'Copied'); window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () { copy.classList.remove('is-active'); copy.replaceChildren(uiIcon('copy')); copy.title = 'Copy message'; copy.setAttribute('aria-label', 'Copy message'); actionFeedback(article, ''); }, 1800);
      }).catch(function () { actionFeedback(article, 'Could not copy. Select and copy the message text instead.'); });
    });
    var share = responseAction(article, 'share', 'Share message');
    var shareMenu = node('div', 'la-share-menu'); shareMenu.hidden = true;
    var email = node('a', '', 'Email'), whatsapp = node('a', '', 'WhatsApp'), copyLink = node('button', '', 'Copy text');
    function updateShareTargets() {
      var encodedAnswer = encodeURIComponent(article._responseText);
      email.href = 'mailto:?subject=' + encodeURIComponent('Lake Assistant message') + '&body=' + encodedAnswer;
      whatsapp.href = 'https://wa.me/?text=' + encodedAnswer;
    }
    updateShareTargets(); whatsapp.target = '_blank'; whatsapp.rel = 'noopener noreferrer';
    copyLink.type = 'button'; copyLink.setAttribute('aria-label', 'Copy response text');
    shareMenu.append(email, whatsapp, copyLink); article.appendChild(shareMenu);
    share.addEventListener('click', function () {
      updateShareTargets();
      if (typeof navigator.share === 'function') {
        navigator.share({ title: 'Lake Assistant message', text: article._responseText }).then(function () { actionFeedback(article, 'Shared'); }, function (error) { if (error && error.name !== 'AbortError') actionFeedback(article, 'Sharing is unavailable on this device.'); });
      } else { shareMenu.hidden = !shareMenu.hidden; if (!shareMenu.hidden) { email.setAttribute('aria-label', 'Share response by email'); whatsapp.setAttribute('aria-label', 'Share response with WhatsApp'); } }
    });
    copyLink.addEventListener('click', function () { copyResponse(article._responseText).then(function () { shareMenu.hidden = true; actionFeedback(article, 'Copied'); }).catch(function () { actionFeedback(article, 'Could not copy this response.'); }); });
    var speak = responseAction(article, 'speaker', 'Read message aloud');
    speak.setAttribute('aria-pressed', 'false'); speak.addEventListener('click', function () { toggleSpeech(article, speak); });
    if (kind === 'assistant' || kind === 'success') {
      var regenerate = responseAction(article, 'regenerate', 'Regenerate response');
      article._regenerateButton = regenerate;
      regenerate.addEventListener('click', function () {
        if (article !== latestResponseArticle && questionArticle && turnId) {
          applyEditedTurn(questionArticle, questionArticle._messageText, null, article);
          return;
        }
        regenerateResponse(article);
      });
    }
    var up = responseAction(article, 'thumb-up', 'Good response');
    var down = responseAction(article, 'thumb-down', 'Bad response');
    article._ratingButtons = { up: up, down: down }; article._rating = null;
    up.setAttribute('aria-pressed', 'false'); down.setAttribute('aria-pressed', 'false');
    up.addEventListener('click', function () { setRating(article, article._rating === 'up' ? null : 'up'); });
    down.addEventListener('click', function () { setRating(article, article._rating === 'down' ? null : 'down'); });
    if (kind === 'error') {
      var retry = responseAction(article, 'regenerate', 'Retry failed question', 'la-retry-action');
      retry.addEventListener('click', function () { retryFailedTurn(article, questionArticle, turnId); });
    }
    article.appendChild(bar);
    if (kind === 'assistant' || kind === 'success') setLatestResponse(article);
  }
  function addUserActions(article) {
    if (!article || article._actionBar) return;
    var bar = node('div', 'la-response-actions la-user-actions');
    bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Your message actions');
    article._actionBar = bar;
    var copy = responseAction(article, 'copy', 'Copy your message');
    copy.addEventListener('click', function () {
      copyResponse(article._messageText).then(function () { actionFeedback(article, 'Copied'); }).catch(function () { actionFeedback(article, 'Could not copy this message.'); });
    });
    var edit = responseAction(article, 'edit', 'Edit your message');
    edit.addEventListener('click', function () { openMessageEditor(article); });
    article.appendChild(bar);
  }
  function openMessageEditor(article) {
    if (!article || article._editor || activeChatController || chatStreamActive) return;
    var editor = node('div', 'la-message-editor');
    var field = node('textarea', 'la-edit-input'); field.value = article._messageText || article._answerParagraph.textContent; field.maxLength = 1000; field.rows = 2;
    field.setAttribute('aria-label', 'Edit your message');
    var controls = node('div', 'la-edit-controls');
    var save = node('button', 'la-edit-save', 'Save'); save.type = 'button';
    var cancel = node('button', 'la-edit-cancel', 'Cancel'); cancel.type = 'button';
    var status = node('span', 'la-edit-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    controls.append(save, cancel); editor.append(field, controls, status);
    article.appendChild(editor); article._editor = { root: editor, field: field, save: save, cancel: cancel, status: status };
    article._actionBar.hidden = true;
    save.addEventListener('click', function () { applyEditedTurn(article, field.value, article._editor); });
    cancel.addEventListener('click', function () { closeMessageEditor(article); });
    field.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); closeMessageEditor(article); } });
    field.focus(); field.setSelectionRange(field.value.length, field.value.length);
  }
  function closeMessageEditor(article) {
    if (!article || !article._editor || article._editing) return;
    article._editor.root.remove(); article._editor = null; article._actionBar.hidden = false;
  }
  function clearMessageActions(article) {
    if (article._actionBar) article._actionBar.remove();
    if (article._actionFeedback) article._actionFeedback.remove();
    Array.prototype.slice.call(article.querySelectorAll('.la-share-menu')).forEach(function (menu) { menu.remove(); });
    article._actionBar = null; article._actionFeedback = null; article._regenerateButton = null; article._ratingButtons = null;
  }
  function retryFailedTurn(errorArticle, questionArticle, turnId) {
    if (!questionArticle || !turnId || activeChatController) { actionFeedback(errorArticle, 'This question cannot be retried in the current conversation.'); return; }
    applyEditedTurn(questionArticle, questionArticle._messageText, null, errorArticle);
  }
  function setRating(article, rating) {
    article._rating = rating;
    article._ratingButtons.up.setAttribute('aria-pressed', rating === 'up' ? 'true' : 'false');
    article._ratingButtons.down.setAttribute('aria-pressed', rating === 'down' ? 'true' : 'false');
    article._ratingButtons.up.classList.toggle('is-active', rating === 'up');
    article._ratingButtons.down.classList.toggle('is-active', rating === 'down');
    actionFeedback(article, rating ? (rating === 'up' ? 'Marked helpful' : 'Marked not helpful') : 'Feedback removed');
    window.setTimeout(function () { if (article._rating === rating && rating === null) actionFeedback(article, ''); }, 1400);
  }
  function copyResponse(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea'); field.value = text; field.setAttribute('readonly', '');
      field.style.position = 'fixed'; field.style.opacity = '0'; field.style.pointerEvents = 'none'; document.body.appendChild(field); field.select();
      var copied = false; try { copied = document.execCommand('copy'); } catch (_) {}
      field.remove(); copied ? resolve() : reject(new Error('Clipboard unavailable'));
    });
  }
  function speechChunks(text) {
    var sentences = String(text || '').replace(/https?:\/\/\S+/g, '').split(/(?<=[.!?])\s+/).filter(Boolean), chunks = [], current = '';
    sentences.forEach(function (sentence) {
      while (sentence.length > 220) { if (current) { chunks.push(current); current = ''; } var breakAt = sentence.lastIndexOf(' ', 220); if (breakAt < 80) breakAt = 220; chunks.push(sentence.slice(0, breakAt)); sentence = sentence.slice(breakAt).trim(); }
      if ((current + ' ' + sentence).trim().length > 220) { if (current) chunks.push(current); current = sentence; } else current = (current + ' ' + sentence).trim();
    });
    if (current) chunks.push(current); return chunks;
  }
  function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (speechState && speechState.button) { speechState.button.classList.remove('is-active'); speechState.button.setAttribute('aria-pressed', 'false'); speechState.button.title = 'Read message aloud'; speechState.button.setAttribute('aria-label', 'Read message aloud'); }
    speechState = null;
  }
  function toggleSpeech(article, button) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') { actionFeedback(article, 'Read aloud is not supported by this browser.'); return; }
    if (speechState && speechState.article === article) { stopSpeech(); return; }
    stopSpeech();
    var synthesis = window.speechSynthesis, voices = synthesis.getVoices().filter(function (voice) { return voice.localService === true; });
    var language = String(article._responseLocale || 'en').toLowerCase().split('-')[0];
    var voice = voices.find(function (item) { return String(item.lang || '').toLowerCase().split('-')[0] === language; });
    if (!voice) { actionFeedback(article, language === 'sw' ? 'No on-device Kiswahili voice is available on this device.' : 'No on-device English voice is available on this device.'); return; }
    var chunks = speechChunks(article._responseText), stateForSpeech = { article: article, button: button, chunks: chunks, index: 0 };
    speechState = stateForSpeech; button.classList.add('is-active'); button.setAttribute('aria-pressed', 'true'); button.title = 'Stop reading message'; button.setAttribute('aria-label', 'Stop reading message');
    function speakNext() {
      if (speechState !== stateForSpeech) return;
      if (stateForSpeech.index >= chunks.length) { stopSpeech(); return; }
      var utterance = new window.SpeechSynthesisUtterance(chunks[stateForSpeech.index++]); utterance.voice = voice; utterance.lang = voice.lang; utterance.onend = speakNext; utterance.onerror = function () { if (speechState === stateForSpeech) { stopSpeech(); actionFeedback(article, 'Read aloud stopped because playback failed.'); } };
      synthesis.speak(utterance);
    }
    speakNext();
  }
  async function regenerateResponse(article) {
    if (article !== latestResponseArticle || activeChatController || chatStreamActive || article._regenerating) return;
    article._regenerating = true; article._regenerateButton.disabled = true; article.setAttribute('aria-busy', 'true');
    actionFeedback(article, 'Regenerating response…'); stopSpeech();
    var typing = node('div', 'la-typing la-regenerate-loading'); typing.setAttribute('role', 'status'); typing.setAttribute('aria-label', 'Regenerating response');
    var dots = node('span', 'la-typing-dots'); for (var dot = 0; dot < 3; dot++) dots.appendChild(node('i')); typing.appendChild(dots); refs.messages.appendChild(typing); followStreamToLatest();
    var controller = new AbortController(); activeChatController = controller; chatStreamActive = true; chatStreamFollow = true;
    var preview = null, previewParagraph = null, candidate = '';
    try {
      var endpoint = (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/regenerate';
      var response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson, application/json' }, body: '{}', signal: controller.signal });
      if (!response.ok) { var problem = await response.json().catch(function () { return {}; }); throw Object.assign(new Error(problem?.error?.message || 'Regeneration is unavailable.'), { code: problem?.error?.code || 'REGENERATION_FAILED' }); }
      var payload;
      if ((response.headers.get('Content-Type') || '').toLowerCase().indexOf('application/x-ndjson') >= 0) {
        payload = await readChatStream(response, function (text) {
          if (typing.isConnected) typing.remove();
          if (!preview) { preview = streamArticle(''); preview.article.classList.add('la-regeneration-preview'); preview.article.setAttribute('aria-label', 'New response preview'); previewParagraph = preview.paragraph; }
          candidate += text; previewParagraph.textContent = safeAnswerText(candidate); followStreamToLatest();
        });
      } else payload = await response.json();
      var nextAnswer = String(payload && payload.answer || candidate).trim();
      if (!nextAnswer) throw new Error('Lake Assistant returned an empty response.');
      if (typing.isConnected) typing.remove();
      if (preview) preview.article.remove();
      article._answerParagraph.textContent = safeAnswerText(nextAnswer);
      Array.prototype.slice.call(article.querySelectorAll('.la-links')).forEach(function (item) { item.remove(); });
      var links = Array.isArray(payload.sources) ? payload.sources.filter(function (source) { return source && typeof source.title === 'string' && /^https:\/\/www\.lakeoilgroup\.com\//i.test(source.url || ''); }).map(function (source) { return { t: source.title, u: source.url }; }) : [];
      appendSources(article, links); article._responseText = safeAnswerText(nextAnswer); article._responseLocale = payload.locale || article._responseLocale;
      setRating(article, null); actionFeedback(article, 'Response regenerated');
      window.setTimeout(function () { if (article._rating === null) actionFeedback(article, ''); }, 1800);
    } catch (error) {
      if (typing.isConnected) typing.remove(); if (preview && preview.article.isConnected) preview.article.remove();
      var message = error && error.code === 'INSUFFICIENT_MEMORY_HEADROOM' ? 'Regeneration is paused because available memory is too low. Your previous response is unchanged.' : 'Could not regenerate. Your previous response is unchanged.';
      if (!controller.signal.aborted) actionFeedback(article, message);
    } finally {
      article._regenerating = false; article.removeAttribute('aria-busy'); article._regenerateButton.disabled = false;
      chatStreamActive = false; if (activeChatController === controller) activeChatController = null;
    }
  }
  function followStreamToLatest() {
    if (chatStreamFollow) refs.messages.scrollTop = refs.messages.scrollHeight;
  }
  async function readChatStream(response, onText) {
    if (!response.body || !response.body.getReader) throw new Error('Streaming is unavailable in this browser.');
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var pending = '';
    var completion = null;
    async function acceptLine(line) {
      if (!line.trim()) return;
      var event = JSON.parse(line);
      if (event.type === 'delta' && typeof event.text === 'string') onText(event.text);
      else if (event.type === 'done') completion = event;
      else if (event.type === 'error') throw Object.assign(new Error(event.message || 'Lake Assistant could not complete this response.'), { code: event.code || 'ASSISTANT_STREAM_FAILED' });
    }
    try {
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        pending += decoder.decode(result.value, { stream: true });
        var newline;
        while ((newline = pending.indexOf('\n')) >= 0) {
          var line = pending.slice(0, newline);
          pending = pending.slice(newline + 1);
          await acceptLine(line);
        }
      }
      pending += decoder.decode();
      if (pending.trim()) await acceptLine(pending);
    } finally { reader.releaseLock(); }
    if (!completion) throw new Error('The response stream ended before Lake Assistant finished.');
    return completion;
  }
  function build() {
    var mount = document.getElementById('chat-widget') || document.body.appendChild(node('div'));
    mount.id = 'chat-widget';
    mount.className = 'la-widget';
    mount.replaceChildren();
    var launcher = node('button', 'la-launcher');
    launcher.type = 'button';
    launcher.appendChild(uiIcon('chat'));
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'lake-assistant-panel');
    launcher.setAttribute('aria-label', 'Open Lake Assistant');

    var panel = node('section', 'la-panel');
    panel.id = 'lake-assistant-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Lake Assistant');
    var header = node('header', 'la-head');
    var brand = node('div', 'la-brand');
    var logo = document.createElement('img');
    logo.src = 'assets/images/logos/LAKE_LOGO_LAKE_ONLY_BLUE.png';
    logo.alt = 'Lake';
    var close = node('button', 'la-close');
    close.type = 'button';
    close.appendChild(uiIcon('close'));
    close.setAttribute('aria-label', 'Close Lake Assistant');
    brand.appendChild(logo);
    header.append(brand, close);

    var messages = node('div', 'la-messages is-welcome');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions text');
    var form = node('form', 'la-form');
    var input = document.createElement('textarea');
    input.rows = 1;
    input.maxLength = 300;
    input.placeholder = 'Ask Lake...';
    input.setAttribute('enterkeyhint', 'send');
    input.setAttribute('aria-label', 'Ask Lake');
    var submit = node('button', 'la-send');
    submit.type = 'submit';
    submit.setAttribute('aria-label', 'Send message');
    submit.appendChild(uiIcon('send'));
    var voiceButton = node('button', 'la-voice');
    voiceButton.type = 'button'; voiceButton.setAttribute('aria-label', 'Start voice input'); voiceButton.setAttribute('title', 'Voice input'); voiceButton.appendChild(uiIcon('mic'));
    var voiceStatus = node('div', 'la-voice-status'); voiceStatus.hidden = true; voiceStatus.setAttribute('role', 'group'); voiceStatus.setAttribute('aria-label', 'Voice input controls');
    var voiceWave = node('span', 'la-voice-wave'); voiceWave.setAttribute('aria-hidden', 'true');
    for (var waveBar = 0; waveBar < 5; waveBar++) voiceWave.appendChild(node('i'));
    var voiceMessage = node('span', 'la-voice-message'); voiceMessage.setAttribute('role', 'status'); voiceMessage.setAttribute('aria-live', 'polite');
    var voiceStop = node('button', 'la-voice-stop'); voiceStop.type = 'button'; voiceStop.setAttribute('aria-label', 'Stop recording'); voiceStop.title = 'Stop recording'; voiceStop.appendChild(uiIcon('stop'));
    var voiceCancel = node('button', 'la-voice-cancel'); voiceCancel.type = 'button'; voiceCancel.setAttribute('aria-label', 'Cancel voice input'); voiceCancel.title = 'Cancel voice input'; voiceCancel.appendChild(uiIcon('close'));
    voiceStatus.append(voiceWave, voiceMessage, voiceStop, voiceCancel);
    var composerControls = node('div', 'la-composer-controls'); composerControls.append(voiceStatus, voiceButton, submit);
    form.append(input, composerControls);
    panel.append(header, messages, form);
    mount.append(panel, launcher);
    refs = { mount: mount, launcher: launcher, panel: panel, close: close, messages: messages, form: form, input: input, voiceButton: voiceButton, voiceStatus: voiceStatus, voiceMessage: voiceMessage, voiceWave: voiceWave, voiceStop: voiceStop, voiceCancel: voiceCancel };

    messages.addEventListener('scroll', function () {
      if (!chatStreamActive) return;
      chatStreamFollow = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 56;
    }, { passive: true });
    launcher.addEventListener('click', function () { panel.hidden ? open() : closePanel(true); });
    close.addEventListener('click', function () { closePanel(true); });
    form.addEventListener('submit', send);
    configureVoiceAvailability();
    voiceButton.addEventListener('click', startVoice);
    voiceStop.addEventListener('click', stopVoice);
    voiceCancel.addEventListener('click', function () { cancelVoice(true); });
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      if (event.repeat || !input.value.trim()) return;
      form.requestSubmit();
    });
    input.addEventListener('input', growInput);
    panel.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) closePanel(true);
    });
    document.addEventListener('pointerdown', function (event) {
      if (!panel.hidden && !mount.contains(event.target)) closePanel(false);
    });
    if (window.visualViewport) {
      var syncViewport = function () { mount.style.setProperty('--la-viewport-height', window.visualViewport.height + 'px'); };
      window.visualViewport.addEventListener('resize', syncViewport);
      syncViewport();
    }
    window.addEventListener('pagehide', function () { cancelVoice(false); stopSpeech(); });
  }
  function open() {
    if (!refs.panel.hidden) return;
    var returning = hasWelcomed;
    refs.panel.hidden = false;
    refs.launcher.setAttribute('aria-expanded', 'true');
    refs.mount.classList.add('la-open');
    showWelcome(returning);
    refs.input.focus({ preventScroll: true });
  }
  function closePanel(restoreFocus) {
    cancelVoice(false);
    stopSpeech();
    if (activeChatController) {
      activeChatController.abort();
      activeChatController = null;
    }
    chatStreamActive = false;
    clearWelcome();
    refs.panel.hidden = true;
    refs.launcher.setAttribute('aria-expanded', 'false');
    refs.mount.classList.remove('la-open');
    if (restoreFocus) refs.launcher.focus({ preventScroll: true });
  }
  function growInput() {
    refs.input.style.height = '0px';
    refs.input.style.height = Math.min(refs.input.scrollHeight, 104) + 'px';
  }
  function trapTab(event) {
    if (event.key !== 'Tab') return;
    var items = Array.prototype.slice.call(refs.panel.querySelectorAll('button:not([disabled]), textarea:not([disabled]), a[href]')).filter(function (item) { return !item.closest('[hidden]'); });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function clearWelcome() {
    welcomeToken++;
    window.clearTimeout(welcomeTimer);
    welcomeTimer = null;
    if (welcomeTyping) welcomeTyping.remove();
    welcomeTyping = null;
    welcomeText = '';
  }
  function welcomeMessage(returning) {
    var language = String(lang()).toLowerCase().split('-')[0];
    if (language === 'sw') return returning
      ? 'Karibu tena! Nikusaidie nini wakati huu? Unaweza kuniuliza chochote kuhusu Lake Group.'
      : 'Habari! Nikusaidie nini leo?';
    return returning
      ? 'Welcome back! What can I help you with this time? Feel free to ask me anything about Lake Group.'
      : 'Hi there! How can I help you today?';
  }
  function showWelcome(returning) {
    clearWelcome();
    var token = welcomeToken;
    welcomeTyping = node('div', 'la-typing');
    welcomeTyping.setAttribute('role', 'status');
    welcomeTyping.setAttribute('aria-label', 'Lake is typing');
    var dots = node('span', 'la-typing-dots');
    for (var i = 0; i < 3; i++) dots.appendChild(node('i'));
    welcomeTyping.appendChild(dots);
    refs.messages.appendChild(welcomeTyping);
    welcomeText = welcomeMessage(returning);
    refs.messages.scrollTop = refs.messages.scrollHeight;
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    welcomeTimer = window.setTimeout(function () {
      if (token !== welcomeToken || refs.panel.hidden || !welcomeTyping) return;
      welcomeTyping.remove();
      welcomeTyping = null;
      welcomeTimer = null;
      draw({ role: 'bot', type: 'welcome', text: welcomeText });
      welcomeText = '';
      hasWelcomed = true;
    }, reducedMotion ? 350 : 850);
  }
  async function applyEditedTurn(questionArticle, editedText, editor, errorArticle) {
    if (activeChatController || chatStreamActive || !questionArticle) return;
    var query = String(editedText || '').trim();
    if (!query || query.length > 1000) {
      if (editor) editor.status.textContent = 'Enter a message of up to 1,000 characters.';
      else if (errorArticle) actionFeedback(errorArticle, 'Enter a message before retrying.');
      return;
    }
    var turnId = questionArticle._turnId || questionArticle.dataset.turnId;
    if (!turnId) {
      if (editor) editor.status.textContent = 'This message cannot be linked to the current conversation. Send it as a new message instead.';
      return;
    }
    if (editor) { editor.save.disabled = true; editor.cancel.disabled = true; editor.status.textContent = 'Updating this conversation…'; }
    else if (errorArticle) actionFeedback(errorArticle, 'Retrying this question…');
    var typing = node('div', 'la-typing'); typing.setAttribute('role', 'status'); typing.setAttribute('aria-label', 'Lake is typing');
    var dots = node('span', 'la-typing-dots'); for (var dot = 0; dot < 3; dot++) dots.appendChild(node('i')); typing.appendChild(dots);
    refs.messages.appendChild(typing); followStreamToLatest();
    var priorAssistant = Array.prototype.slice.call(refs.messages.querySelectorAll('.la-message.la-bot')).find(function (item) { return item._turnId === turnId || item.dataset.turnId === turnId; }) || null;
    var preview = null, previewParagraph = null, streamedText = '';
    var controller = new AbortController(); activeChatController = controller; chatStreamActive = true; chatStreamFollow = true;
    var sendButton = refs.form.querySelector('.la-send'); sendButton.disabled = true;
    try {
      var endpoint = (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/edit';
      var response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson, application/json' },
        body: JSON.stringify({ turnId: turnId, message: query, locale: /^sw(?:-|$)/i.test(lang()) ? 'sw' : 'en' }),
        signal: controller.signal
      });
      if (!response.ok) {
        var problem = await response.json().catch(function () { return {}; });
        throw Object.assign(new Error(problem && problem.error && problem.error.message || 'The conversation could not be updated.'), { code: problem && problem.error && problem.error.code || 'EDIT_FAILED' });
      }
      var payload;
      if ((response.headers.get('Content-Type') || '').toLowerCase().indexOf('application/x-ndjson') >= 0) {
        payload = await readChatStream(response, function (text) {
          if (typing.isConnected) typing.remove();
          if (!preview) { var partial = streamArticle('', turnId); preview = partial.article; preview.classList.add('la-edit-preview'); previewParagraph = partial.paragraph; }
          streamedText += text; previewParagraph.textContent = safeAnswerText(streamedText); followStreamToLatest();
        });
      } else payload = await response.json();
      var answerText = String(payload && payload.answer || streamedText).trim();
      if (!answerText) throw new Error('Lake Assistant returned an empty replacement answer.');
      if (typing.isConnected) typing.remove(); if (preview && preview.isConnected) preview.remove();

      var messages = Array.prototype.slice.call(refs.messages.querySelectorAll('.la-message'));
      var userPosition = messages.indexOf(questionArticle);
      messages.slice(userPosition + 1).forEach(function (item) { if (item !== priorAssistant) item.remove(); });
      Array.prototype.slice.call(refs.messages.querySelectorAll('.la-typing')).forEach(function (item) { item.remove(); });
      questionArticle._answerParagraph.textContent = safeAnswerText(query);
      questionArticle._messageText = safeAnswerText(query);
      questionArticle._turnId = turnId; questionArticle.dataset.turnId = turnId;
      var answerArticle = priorAssistant;
      if (!answerArticle || !answerArticle.isConnected) {
        answerArticle = node('article', 'la-message la-bot');
        answerArticle.dataset.turnId = turnId; answerArticle._turnId = turnId; answerArticle._messageKind = 'assistant';
        var body = node('div', 'la-message-body'), paragraph = node('p'); body.appendChild(paragraph); answerArticle.appendChild(body);
        answerArticle._messageBody = body; answerArticle._answerParagraph = paragraph;
        refs.messages.insertBefore(answerArticle, questionArticle.nextSibling);
      } else {
        refs.messages.insertBefore(answerArticle, questionArticle.nextSibling);
      }
      clearMessageActions(answerArticle);
      answerArticle.classList.remove('la-edit-preview'); answerArticle._messageKind = 'assistant';
      answerArticle._answerParagraph.textContent = safeAnswerText(answerText); answerArticle._messageText = safeAnswerText(answerText);
      Array.prototype.slice.call(answerArticle.querySelectorAll('.la-links')).forEach(function (item) { item.remove(); });
      var links = Array.isArray(payload.sources) ? payload.sources.filter(function (source) { return source && typeof source.title === 'string' && /^https:\/\/www\.lakeoilgroup\.com\//i.test(source.url || ''); }).map(function (source) { return { t: source.title, u: source.url }; }) : [];
      appendSources(answerArticle, links);
      addResponseActions(answerArticle, answerText, payload.locale, 'assistant', turnId, questionArticle);
      if (editor) { editor.root.remove(); questionArticle._editor = null; questionArticle._actionBar.hidden = false; }
      actionFeedback(answerArticle, 'Message updated');
      window.setTimeout(function () { if (answerArticle._actionFeedback) actionFeedback(answerArticle, ''); }, 1500);
      followStreamToLatest();
    } catch (error) {
      if (typing.isConnected) typing.remove(); if (preview && preview.isConnected) preview.remove();
      if (controller.signal.aborted) {
        if (editor) {
          editor.status.textContent = 'Update canceled. Your previous conversation is unchanged.';
          editor.save.disabled = false; editor.cancel.disabled = false;
        }
      } else {
        var note = 'Could not update the conversation. Your previous messages are unchanged.';
        if (error && error.code === 'INSUFFICIENT_MEMORY_HEADROOM') note = 'The replacement is paused because available memory is too low. Your previous conversation is unchanged.';
        if (editor) {
          editor.status.textContent = note;
          editor.save.disabled = false; editor.cancel.disabled = false;
          if (!editor.retry) {
            editor.retry = node('button', 'la-edit-retry', 'Retry'); editor.retry.type = 'button';
            editor.retry.addEventListener('click', function () { applyEditedTurn(questionArticle, editor.field.value, editor); });
            editor.root.appendChild(editor.retry);
          }
        } else if (errorArticle) actionFeedback(errorArticle, note + ' You can retry this question.');
      }
    } finally {
      chatStreamActive = false;
      if (activeChatController === controller) activeChatController = null;
      sendButton.disabled = false;
    }
  }
  function send(event) {
    event.preventDefault();
    if (activeChatController) return;
    if (voiceState.active || voiceState.pending) {
      voiceState.sendAfterTranscript = true;
      if (voiceState.active) stopVoice();
      return;
    }
    var query = refs.input.value.trim();
    if (!query) return;
    if (welcomeTimer) {
      window.clearTimeout(welcomeTimer);
      welcomeTimer = null;
      if (welcomeTyping) welcomeTyping.remove();
      welcomeTyping = null;
      draw({ role: 'bot', type: 'welcome', text: welcomeText });
      welcomeText = '';
      hasWelcomed = true;
    }
    refs.input.value = '';
    growInput();
    var turnId = messageUuid();
    var questionArticle = draw({ role: 'user', text: query, turnId: turnId });
    var typing = node('div', 'la-typing');
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-label', 'Lake is typing');
    var dots = node('span', 'la-typing-dots');
    for (var i = 0; i < 3; i++) dots.appendChild(node('i'));
    typing.appendChild(dots);
    refs.messages.appendChild(typing);
    refs.messages.scrollTop = refs.messages.scrollHeight;
    chatStreamActive = true;
    chatStreamFollow = true;
    var controller = new AbortController();
    activeChatController = controller;
    var sendButton = refs.form.querySelector('.la-send');
    sendButton.disabled = true;
    var answerArticle = null;
    var answerParagraph = null;
    var answerComplete = false;
    var streamedText = '';
    var assistantApi = (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/chat';
    (async function () {
      try {
        var response = await fetch(assistantApi, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson, application/json' },
          body: JSON.stringify({ message: query, turnId: turnId, locale: /^sw(?:-|$)/i.test(lang()) ? 'sw' : 'en' }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Assistant request unavailable.');
        var payload;
        if ((response.headers.get('Content-Type') || '').toLowerCase().indexOf('application/x-ndjson') >= 0) {
          payload = await readChatStream(response, function (text) {
            if (typing.isConnected) typing.remove();
            if (!answerArticle) {
              refs.messages.classList.remove('is-welcome');
              var message = streamArticle('', turnId);
              answerArticle = message.article;
              answerParagraph = message.paragraph;
            }
            streamedText += text;
            answerParagraph.textContent = safeAnswerText(streamedText);
            followStreamToLatest();
          });
        } else payload = await response.json();
        var answerText = String(payload && payload.answer || '').trim();
        if (!answerText) throw new Error('Assistant returned an empty reply.');
        answerComplete = true;
        if (typing.isConnected) typing.remove();
        if (!answerArticle) {
          var finalMessage = streamArticle(answerText, turnId);
          answerArticle = finalMessage.article;
          answerParagraph = finalMessage.paragraph;
        } else answerParagraph.textContent = safeAnswerText(answerText);
        var links = Array.isArray(payload.sources) ? payload.sources.filter(function (source) {
          return source && typeof source.title === 'string' && /^https:\/\/www\.lakeoilgroup\.com\//i.test(source.url || '');
        }).map(function (source) { return { t: source.title, u: source.url }; }) : [];
        appendSources(answerArticle, links);
        addResponseActions(answerArticle, answerText, payload.locale, 'assistant', turnId, questionArticle);
        followStreamToLatest();
        var noEvidence = payload.status === 'no_evidence';
        if (window.LakeAnalytics && window.LakeAnalytics.track) window.LakeAnalytics.track(noEvidence ? 'CHAT_NO_MATCH' : 'CHAT_QUESTION', { page: location.pathname, language: lang(), query: query.slice(0, 300) });
        if (noEvidence && window.LAKE_API_BASE) fetch(window.LAKE_API_BASE.replace(/\/$/, '') + '/api/public/assistant/unanswered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: query.slice(0, 300), page: location.pathname, language: lang() }), keepalive: true }).catch(function () {});
      } catch (error) {
        if (typing.isConnected) typing.remove();
        if (!answerComplete && answerArticle && answerArticle.isConnected) answerArticle.remove();
        if (!controller.signal.aborted) draw({ role: 'bot', type: 'error', text: 'Lake Assistant is temporarily unavailable. Please try again shortly.', turnId: turnId, questionArticle: questionArticle });
      } finally {
        chatStreamActive = false;
        if (activeChatController === controller) {
          activeChatController = null;
          sendButton.disabled = false;
        }
      }
    })();
  }
  function canRecordLocally() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)); }
  function voiceEndpoint(path) { return (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/' + path; }
  function configureVoiceAvailability() {
    var localCaptureAvailable = canRecordLocally();
    refs.voiceButton.hidden = false;
    refs.voiceButton.disabled = true;
    refs.voiceButton.title = 'Checking private voice input…';
    refs.voiceButton.setAttribute('aria-label', 'Checking private voice input availability');
    if (!localCaptureAvailable) {
      setVoiceUnavailable('Voice input unavailable: this browser does not support the required microphone recording APIs.');
      return;
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkVoiceAvailability(); });
    window.addEventListener('online', checkVoiceAvailability);
    checkVoiceAvailability();
  }
  function checkVoiceAvailability() {
    if (!canRecordLocally() || voiceState.active || voiceState.pending) return;
    window.clearTimeout(voiceState.healthTimer);
    fetch(voiceEndpoint('voice-health'), { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) }).then(function (response) {
      if (!response.ok) throw new Error('Voice service unavailable.');
      return response.json();
    }).then(function (payload) {
      voiceState.localReady = !!(payload && payload.ready);
      if (voiceState.localReady) {
        voiceState.healthFailures = 0;
        refs.voiceButton.disabled = false;
        refs.voiceButton.classList.remove('is-unavailable');
        refs.voiceButton.removeAttribute('aria-disabled');
        refs.voiceButton.title = 'Voice input (pauses do not stop recording)';
        refs.voiceButton.setAttribute('aria-label', 'Start voice input');
      } else {
        voiceState.healthFailures = Math.min(voiceState.healthFailures + 1, 4);
        var reason = payload && payload.reason;
        var label = reason === 'insufficient_memory' ? 'Voice input temporarily unavailable: available device memory is below the safe transcription requirement.' : 'Voice input temporarily unavailable: the private transcription runtime is not ready.';
        setVoiceUnavailable(label);
      }
    }).catch(function () {
      voiceState.localReady = false;
      voiceState.healthFailures = Math.min(voiceState.healthFailures + 1, 4);
      voiceDiagnostic('VOICE_HEALTH_UNAVAILABLE');
      setVoiceUnavailable('Voice input temporarily unavailable: the private assistant service is offline.');
    }).finally(function () {
      if (!voiceState.localReady && canRecordLocally()) {
        var retryDelay = Math.min(15000 * Math.pow(2, Math.max(0, voiceState.healthFailures - 1)), 60000);
        voiceState.healthTimer = window.setTimeout(checkVoiceAvailability, retryDelay);
      }
    });
  }
  function setVoiceUnavailable(accessibleLabel) {
    refs.voiceButton.hidden = false;
    refs.voiceButton.disabled = true;
    refs.voiceButton.classList.add('is-unavailable');
    refs.voiceButton.title = accessibleLabel || 'Voice input unavailable: the private transcription service is not ready.';
    refs.voiceButton.setAttribute('aria-disabled', 'true');
    refs.voiceStatus.hidden = true;
    refs.voiceMessage.textContent = '';
    refs.form.classList.remove('la-voice-live');
    refs.voiceButton.classList.remove('is-listening');
    refs.voiceStatus.classList.remove('is-listening', 'is-processing');
    refs.voiceButton.setAttribute('aria-label', refs.voiceButton.title);
  }
  function voiceUi(message, visible) {
    refs.voiceStatus.hidden = !visible;
    refs.voiceMessage.textContent = message || '';
    refs.voiceWave.hidden = !voiceState.active && !voiceState.pending;
    refs.voiceStop.hidden = !voiceState.active;
    refs.voiceCancel.hidden = !voiceState.active && !voiceState.pending;
    refs.voiceMessage.setAttribute('aria-live', voiceState.active && message.indexOf('Recording ·') === 0 ? 'off' : 'polite');
    refs.voiceButton.classList.toggle('is-listening', !!(visible && voiceState.active));
    refs.voiceStatus.classList.toggle('is-listening', !!(visible && voiceState.active));
    refs.voiceStatus.classList.toggle('is-processing', !!(visible && voiceState.pending));
    refs.form.classList.toggle('la-voice-live', !!(visible && (voiceState.active || voiceState.pending)));
    refs.voiceButton.setAttribute('aria-label', voiceState.active ? 'Listening. Stop or cancel voice input.' : refs.voiceButton.disabled ? (refs.voiceButton.title || 'Voice input unavailable') : 'Start voice input');
    refs.voiceButton.setAttribute('aria-pressed', voiceState.active ? 'true' : 'false');
    refs.voiceStop.disabled = !voiceState.active || !!voiceState.pending;
  }
  function renderVoiceDraft() {
    var recognized = voiceState.finalText;
    var separator = voiceState.baseText && recognized && !/\s$/.test(voiceState.baseText) ? ' ' : '';
    refs.input.value = voiceState.baseText + separator + recognized;
    growInput();
  }
  function finishVoice(session) {
    if (session !== voiceState.session || voiceState.submitted) return;
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    voiceState.submitted = true;
    var sendAfterTranscript = voiceState.sendAfterTranscript;
    voiceState.sendAfterTranscript = false;
    var finalText = String(voiceState.finalText || '').trim();
    voiceState.finalText = finalText;
    voiceState.active = false; voiceState.pending = false; voiceState.mode = '';
    refs.input.readOnly = false;
    voiceState.pcmChunks = []; voiceState.pcmSamples = 0;
    if (finalText) {
      renderVoiceDraft();
      voiceUi('', false);
      refs.voiceButton.title = 'Transcript ready. Review the text in the message field before sending.';
      refs.voiceButton.setAttribute('aria-label', refs.voiceButton.title);
    } else {
      refs.input.value = voiceState.baseText; growInput();
      voiceUi('', false);
      refs.voiceButton.title = 'No speech was recognized. Try again or type your message.';
      refs.voiceButton.setAttribute('aria-label', refs.voiceButton.title);
    }
    focusVoiceDraft();
    if (sendAfterTranscript && finalText && refs.input.value.trim()) window.setTimeout(function () {
      if (session === voiceState.session && !voiceState.active && !voiceState.pending) refs.form.requestSubmit();
    }, 0);
  }
  function focusVoiceDraft() {
    if (!refs.panel || refs.panel.hidden || !refs.input) return;
    try { refs.input.focus({ preventScroll: true }); } catch (_) { refs.input.focus(); }
  }
  function voiceDiagnostic(code) {
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    if (window.console && typeof window.console.warn === 'function') window.console.warn('[Lake Assistant voice]', String(code || 'VOICE_INPUT_FAILED').slice(0, 48));
  }
  function voiceTiming(stage, elapsedMs) {
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    if (window.console && typeof window.console.info === 'function') window.console.info('[Lake Assistant voice timing]', stage, Math.round(elapsedMs) + 'ms');
  }
  function resetVoiceDraft(message) {
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    voiceState.active = false; voiceState.pending = false; voiceState.sendAfterTranscript = false; voiceState.mode = '';
    window.clearInterval(voiceState.counterTimer); voiceState.counterTimer = null;
    stopVoiceMeter();
    refs.input.readOnly = false;
    refs.input.value = voiceState.baseText; growInput();
    if (message) {
      voiceUi('', false);
      refs.voiceButton.title = message;
      refs.voiceButton.setAttribute('aria-label', message);
    }
    focusVoiceDraft();
  }
  function startVoice() {
    if (voiceState.active || voiceState.pending || voiceState.captureProcessor || refs.voiceButton.disabled) return;
    var session = ++voiceState.session;
    voiceState.finalText = ''; voiceState.detectedLanguage = ''; voiceState.baseText = refs.input.value; voiceState.submitted = false; voiceState.sendAfterTranscript = false; voiceState.pcmChunks = []; voiceState.pcmSamples = 0; voiceState.partialCursor = 0;
    if (voiceState.localReady && canRecordLocally()) startLocalVoice(session);
    else voiceUi('Voice input is unavailable. You can type your message instead.', true);
  }
  async function startLocalVoice(session) {
    voiceState.mode = 'local'; voiceState.pending = true; voiceState.active = false; refs.input.readOnly = true;
    refs.voiceButton.title = 'Waiting for microphone access';
    refs.voiceButton.setAttribute('aria-label', 'Waiting for microphone access');
    var stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (error) {
      if (session !== voiceState.session) return;
      voiceState.submitted = true;
      var message = error && error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access or type your message.' : error && error.name === 'NotFoundError' ? 'No microphone is available. Connect a microphone or type your message.' : 'The microphone could not be started. Check browser permissions or type your message.';
      voiceDiagnostic(error && error.name || 'MICROPHONE_ACCESS_FAILED'); resetVoiceDraft(message); return;
    }
    if (session !== voiceState.session) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
    voiceState.stream = stream;
    try {
      var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      var context = new AudioContextConstructor(), source = context.createMediaStreamSource(stream);
      var processor = context.createScriptProcessor(4096, 1, 1), silentGain = context.createGain();
      silentGain.gain.value = 0;
      processor.onaudioprocess = function (event) {
        if (session !== voiceState.session || !voiceState.active) return;
        var input = event.inputBuffer, frames = input.length, channels = input.numberOfChannels;
        var mono = new Float32Array(frames);
        for (var channel = 0; channel < channels; channel++) {
          var data = input.getChannelData(channel);
          for (var sample = 0; sample < frames; sample++) mono[sample] += data[sample] / channels;
        }
        voiceState.pcmChunks.push(mono); voiceState.pcmSamples += frames;
      };
      source.connect(processor); processor.connect(silentGain); silentGain.connect(context.destination);
      voiceState.captureContext = context; voiceState.captureSource = source; voiceState.captureProcessor = processor; voiceState.captureGain = silentGain;
      voiceState.pcmSampleRate = context.sampleRate;
      if (context.state === 'suspended') await context.resume();
      if (session !== voiceState.session) { stopVoiceTracks(); return; }
      voiceState.pending = false; voiceState.active = true;
      voiceState.recordingStartedAt = Date.now(); voiceState.meterLevel = 0;
      voiceUi('Recording · 0:00 / 0:30', true);
      startVoiceMeter(stream, session);
      voiceState.counterTimer = window.setInterval(function () { updateRecordingStatus(session); }, 1000);
      voiceState.partialTimer = window.setInterval(function () { requestPartialTranscription(session); }, 350);
      voiceState.timer = window.setTimeout(function () {
        if (session !== voiceState.session || !voiceState.active) return;
        voiceUi('Time limit reached · transcribing…', true);
        stopVoice();
      }, 30_000);
      stream.getTracks().forEach(function (track) { track.addEventListener('ended', function () {
        if (session === voiceState.session && voiceState.active) { voiceDiagnostic('MICROPHONE_TRACK_ENDED'); stopVoice(); }
      }, { once: true }); });
    } catch (error) {
      voiceDiagnostic(error && error.name || 'AUDIO_CAPTURE_FAILED'); stopVoiceTracks(); voiceState.submitted = true; resetVoiceDraft('The microphone recorder is unavailable in this browser. You can type your message.');
    }
  }
  function stopVoiceTracks() {
    stopVoiceMeter();
    window.clearInterval(voiceState.counterTimer); voiceState.counterTimer = null;
    if (voiceState.stream) voiceState.stream.getTracks().forEach(function (track) { track.stop(); });
    voiceState.stream = null;
    if (voiceState.captureProcessor) voiceState.captureProcessor.onaudioprocess = null;
    [voiceState.captureSource, voiceState.captureProcessor, voiceState.captureGain].forEach(function (part) { if (part) { try { part.disconnect(); } catch (_) {} } });
    voiceState.captureSource = voiceState.captureProcessor = voiceState.captureGain = null;
    var captureContext = voiceState.captureContext; voiceState.captureContext = null;
    if (captureContext && captureContext.state !== 'closed') captureContext.close().catch(function () {});
    window.clearInterval(voiceState.partialTimer); voiceState.partialTimer = null;
  }
  function updateRecordingStatus(session) {
    if (session !== voiceState.session || !voiceState.active || voiceState.mode !== 'local') return;
    var elapsed = Math.min(30, Math.floor((Date.now() - voiceState.recordingStartedAt) / 1000));
    var remaining = Math.max(0, 30 - elapsed);
    function clock(seconds) { return '0:' + String(seconds).padStart(2, '0'); }
    voiceUi(remaining <= 5 ? remaining + ' sec left · recording will stop' : 'Recording · ' + clock(elapsed) + ' / 0:30', true);
  }
  function startVoiceMeter(stream, session) {
    var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor || !refs.voiceWave) return;
    try {
      var context = new AudioContextConstructor(), analyser = context.createAnalyser();
      analyser.fftSize = 512;
      var source = context.createMediaStreamSource(stream), samples = new Uint8Array(analyser.fftSize), bars = Array.prototype.slice.call(refs.voiceWave.children);
      source.connect(analyser);
      voiceState.meterContext = context; voiceState.meterSource = source; voiceState.meterAnalyser = analyser;
      if (context.state === 'suspended') context.resume().catch(function () {});
      function measure() {
        if (session !== voiceState.session || !voiceState.active || voiceState.meterAnalyser !== analyser) return;
        analyser.getByteTimeDomainData(samples);
        var sum = 0;
        for (var i = 0; i < samples.length; i++) { var centered = (samples[i] - 128) / 128; sum += centered * centered; }
        var rms = Math.sqrt(sum / samples.length);
        voiceState.meterLevel = Math.min(1, voiceState.meterLevel * 0.58 + Math.max(0, rms * 4.5) * 0.42);
        bars.forEach(function (bar, index) {
          var factor = [0.45, 0.72, 1, 0.68, 0.4][index] || 0.5;
          bar.style.height = (4 + voiceState.meterLevel * 13 * factor) + 'px';
          bar.style.opacity = String(0.62 + voiceState.meterLevel * 0.38);
        });
        voiceState.meterFrame = window.requestAnimationFrame(measure);
      }
      measure();
    } catch (_) { voiceDiagnostic('VOICE_METER_UNAVAILABLE'); }
  }
  function stopVoiceMeter() {
    if (voiceState.meterFrame) window.cancelAnimationFrame(voiceState.meterFrame);
    voiceState.meterFrame = 0;
    if (voiceState.meterSource) { try { voiceState.meterSource.disconnect(); } catch (_) {} }
    voiceState.meterSource = null; voiceState.meterAnalyser = null; voiceState.meterLevel = 0;
    var context = voiceState.meterContext; voiceState.meterContext = null;
    if (context && context.state !== 'closed') context.close().catch(function () {});
    if (refs.voiceWave) Array.prototype.forEach.call(refs.voiceWave.children, function (bar) { bar.style.height = ''; bar.style.opacity = ''; });
  }
  function encodeCapturedWav(startSeconds, endSeconds) {
    var sourceRate = voiceState.pcmSampleRate, targetRate = 16_000;
    var start = Math.max(0, Math.floor((Number(startSeconds) || 0) * sourceRate));
    var end = Number.isFinite(endSeconds) ? Math.min(voiceState.pcmSamples, Math.floor(Math.min(30, endSeconds) * sourceRate)) : Math.min(voiceState.pcmSamples, Math.floor(30 * sourceRate));
    var sourceCount = end - start;
    if (!sourceRate || sourceCount <= 0 || sourceCount / sourceRate > 30.5) throw new Error('Keep voice messages to 30 seconds or less.');
    var count = Math.ceil(sourceCount * targetRate / sourceRate);
    if (!count || count > 30 * targetRate) throw new Error('Keep voice messages to 30 seconds or less.');
    var mono = new Float32Array(sourceCount), offset = 0, cursor = 0;
    for (var part = 0; part < voiceState.pcmChunks.length && offset < sourceCount; part++) {
      var chunk = voiceState.pcmChunks[part], chunkEnd = cursor + chunk.length;
      var overlapStart = Math.max(start, cursor), overlapEnd = Math.min(end, chunkEnd);
      if (overlapEnd > overlapStart) {
        var length = overlapEnd - overlapStart;
        mono.set(chunk.subarray(overlapStart - cursor, overlapEnd - cursor), offset);
        offset += length;
      }
      cursor = chunkEnd;
    }
    if (offset !== sourceCount) throw new Error('The captured audio buffer is incomplete.');
    var pcm = new ArrayBuffer(44 + count * 2), view = new DataView(pcm);
    function writeAscii(offset, value) { for (var i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
    writeAscii(0, 'RIFF'); view.setUint32(4, pcm.byteLength - 8, true); writeAscii(8, 'WAVE'); writeAscii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeAscii(36, 'data'); view.setUint32(40, count * 2, true);
    var ratio = sourceRate / targetRate;
    for (var sample = 0; sample < count; sample++) {
      var begin = Math.floor(sample * ratio), sampleEnd = Math.min(mono.length, Math.floor((sample + 1) * ratio)), sum = 0, total = 0;
      if (sampleEnd <= begin) sampleEnd = Math.min(mono.length, begin + 1);
      for (var j = begin; j < sampleEnd; j++) { sum += mono[j]; total++; }
      var value = Math.max(-1, Math.min(1, total ? sum / total : 0));
      view.setInt16(44 + sample * 2, value < 0 ? value * 32768 : value * 32767, true);
    }
    return new Blob([pcm], { type: 'audio/wav' });
  }
  function appendTranscript(previous, next) {
    var oldWords = String(previous || '').trim().split(/\s+/).filter(Boolean), newWords = String(next || '').trim().split(/\s+/).filter(Boolean);
    if (!oldWords.length) return newWords.join(' ');
    if (!newWords.length) return oldWords.join(' ');
    function key(word) { return word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
    var max = Math.min(8, oldWords.length, newWords.length), overlap = 0;
    for (var length = max; length > 0; length--) {
      var matches = true;
      for (var index = 0; index < length; index++) if (key(oldWords[oldWords.length - length + index]) !== key(newWords[index])) { matches = false; break; }
      if (matches) { overlap = length; break; }
    }
    return oldWords.concat(newWords.slice(overlap)).join(' ');
  }
  function requestPartialTranscription(session) {
    if (session !== voiceState.session || !voiceState.active || voiceState.partialPromise || voiceState.mode !== 'local') return;
    var recordedSeconds = voiceState.pcmSamples / voiceState.pcmSampleRate;
    var windowSeconds = 3.5;
    if (recordedSeconds - voiceState.partialCursor < windowSeconds) return;
    var end = Math.min(30, voiceState.partialCursor + windowSeconds);
    if (end - voiceState.partialCursor < 2.5) return;
    var start = Math.max(0, voiceState.partialCursor - 0.65);
    var wav;
    try { wav = encodeCapturedWav(start, end); }
    catch (error) { voiceDiagnostic(error && error.code || 'PARTIAL_AUDIO_ENCODING_FAILED'); voiceState.partialCursor = end; return; }
    var body = new FormData(); body.append('language', 'auto'); body.append('audio', wav, 'lake-voice-partial.wav');
    var controller = new AbortController(), startedAt = performance.now(); voiceState.partialController = controller;
    var task = fetch(voiceEndpoint('transcribe'), { method: 'POST', credentials: 'same-origin', body: body, signal: controller.signal }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok && !(response.status === 422 && payload?.error?.code === 'NO_SPEECH')) throw Object.assign(new Error('Partial transcription request failed.'), { code: payload?.error?.code || 'PARTIAL_TRANSCRIPTION_FAILED' });
        if (session !== voiceState.session || !voiceState.active) return;
        voiceState.partialCursor = end;
        var recognized = String(payload.text || '').trim();
        if (recognized) {
          voiceState.finalText = appendTranscript(voiceState.finalText, recognized);
          voiceState.detectedLanguage = String(payload.language || voiceState.detectedLanguage || '').toLowerCase();
          renderVoiceDraft();
        }
        voiceTiming('partial-window', performance.now() - startedAt);
      });
    }).catch(function (error) {
      if (session === voiceState.session && error?.name !== 'AbortError') { voiceDiagnostic(error && error.code || 'PARTIAL_TRANSCRIPTION_FAILED'); voiceState.partialCursor = end; }
    }).finally(function () {
      if (session === voiceState.session) { voiceState.partialController = null; voiceState.partialPromise = null; }
    });
    voiceState.partialPromise = task;
  }
  function sendLocalRecording(session, wav) {
    if (wav.size > 1_000_000) return Promise.reject(new Error('The recording is too large. Please use a shorter voice message.'));
    var body = new FormData(); body.append('language', 'auto'); body.append('audio', wav, 'lake-voice.wav');
    var controller = new AbortController(), startedAt = performance.now(); voiceState.controller = controller;
    return fetch(voiceEndpoint('transcribe'), { method: 'POST', credentials: 'same-origin', body: body, signal: controller.signal }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) throw Object.assign(new Error('Transcription request failed.'), { code: payload && payload.error && payload.error.code || 'TRANSCRIPTION_REQUEST_FAILED' });
        if (session !== voiceState.session || voiceState.submitted) return;
        voiceTiming('final-recording', performance.now() - startedAt);
        voiceState.controller = null; voiceState.finalText = String(payload.text || '').trim(); voiceState.detectedLanguage = String(payload.language || '').toLowerCase(); finishVoice(session);
      });
    }).finally(function () { if (session === voiceState.session) voiceState.controller = null; });
  }
  function stopVoice() {
    if (!voiceState.active || voiceState.pending) return;
    if (voiceState.mode !== 'local') return;
    voiceState.active = false; voiceState.pending = true;
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    voiceUi('Transcribing…', true); stopVoiceTracks();
    var session = voiceState.session;
    Promise.resolve(voiceState.partialPromise).catch(function () {}).then(function () {
      if (session !== voiceState.session || voiceState.submitted) return;
      var wav = encodeCapturedWav(0, Infinity);
      return sendLocalRecording(session, wav);
    }).catch(function (error) {
      if (session !== voiceState.session || voiceState.submitted) return;
      voiceDiagnostic(error && error.code || 'FINAL_TRANSCRIPTION_FAILED');
      voiceState.submitted = true; voiceState.active = false; voiceState.pending = false; voiceState.mode = '';
      refs.input.readOnly = false; renderVoiceDraft();
      voiceState.sendAfterTranscript = false;
      var code = error && error.code;
      var failureMessage = code === 'NO_SPEECH' ? 'No speech was recognized. Your draft is still here.'
        : code === 'TRANSCRIPTION_MEMORY_GUARD' ? 'Voice transcription is paused because available memory is below the safe limit. Your draft is still editable.'
          : code === 'TRANSCRIPTION_UNAVAILABLE' || code === 'ASSISTANT_PROXY_UNAVAILABLE' ? 'The private voice service is unavailable right now. Your draft is still editable.'
            : 'Transcription failed. Your recognized words and typed draft are still editable.';
      voiceUi(failureMessage, true);
      focusVoiceDraft();
      if (code === 'TRANSCRIPTION_MEMORY_GUARD' || code === 'TRANSCRIPTION_UNAVAILABLE' || code === 'ASSISTANT_PROXY_UNAVAILABLE') checkVoiceAvailability();
    });
  }
  function cancelVoice(restoreFocus) {
    if (!refs.voiceStatus) return;
    var hadVoice = !!(voiceState.stream || voiceState.active || voiceState.pending || voiceState.captureProcessor);
    voiceState.session++; voiceState.active = false; voiceState.pending = false; voiceState.sendAfterTranscript = false; voiceState.mode = ''; voiceState.finalText = ''; voiceState.pcmChunks = []; voiceState.pcmSamples = 0; voiceState.submitted = true;
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    if (voiceState.controller) voiceState.controller.abort(); voiceState.controller = null;
    if (voiceState.partialController) voiceState.partialController.abort(); voiceState.partialController = null; voiceState.partialPromise = null;
    stopVoiceTracks(); refs.input.readOnly = false;
    if (hadVoice) refs.input.value = voiceState.baseText;
    voiceState.baseText = ''; growInput(); voiceUi('', false);
    if (restoreFocus) focusVoiceDraft();
  }
  window.LakeAssistantV2={classify:intent,entityFor:entity,answer:function(q){return knowledge().then(function(){return reply(q);});},resetConversation:function(){state=newConversationState();},getConversationState:function(){return{currentEntity:state.currentEntity&&state.currentEntity.name||null,currentIntent:state.currentIntent,currentTopic:state.currentTopic,previousQuery:state.previousQuery,recentQuestionCount:state.recentQuestions.length};},getKnowledgeMetadata:function(){return kbMetadata&&kbMetadata.audit||null;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  document.addEventListener('pointerdown',function(e){if(refs.panel&&!refs.panel.hidden&&!refs.mount.contains(e.target))closePanel(false);});
})();
