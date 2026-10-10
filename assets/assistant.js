/* Lake Group Assistant V2 — local, deterministic, approved-content only. */
(function () {
  'use strict';
  if (window.LakeAssistantV2 || window.LAKE_ASSISTANT_ENABLED === false) return;
  var refs = {}, index, assets, companies = [], kbMetadata = null, welcomeTimer = null, welcomeTyping = null, welcomeText = '', welcomeToken = 0, hasWelcomed = false, voiceState = { recognition: null, recorder: null, stream: null, chunks: [], timer: null, recognitionTimer: null, controller: null, mode: '', session: 0, active: false, pending: false, localReady: false, finalText: '', interimText: '', detectedLanguage: '', baseText: '', submitted: false, locale: 'en-US' };
  var groupEntity = { name: 'Lake Group', route: 'about.html', aliases: ['Lake Group', 'Lake Oil Group'] };
  var routes = {
    CONTACT: ['contact.html', 'Contact Lake Group'], CAREERS: ['careers.html', 'Careers at Lake Group'],
    STATIONS: ['station-locator.html', 'Station locator'], COUNTRIES: ['about.html', 'Where Lake Group operates'],
    SUSTAINABILITY: ['csr.html', 'CSR & sustainability'], HISTORY: ['history.html', 'Lake Group history'],
    LEADERSHIP: ['leadership.html', 'Lake Group leadership'], GROUP_COMPANIES: ['index.html', 'Lake Group companies']
  };
  var state = newConversationState();
  function page(){return location.pathname.split('/').pop()||'index.html';} function lang(){return window.LakeI18n&&window.LakeI18n.current||'en';}
  function speechLocale(){return /^sw(?:-|$)/i.test(lang())?'sw-TZ':'en-US';}
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
    } else {
      var arrow = document.createElementNS(svg.namespaceURI, 'path');
      arrow.setAttribute('d', 'M12 19V5m-6 6 6-6 6 6');
      svg.appendChild(arrow);
    }
    return svg;
  }
  function draw(message) {
    if (message.role === 'user') refs.messages.classList.remove('is-welcome');
    var article = node('article', 'la-message la-' + message.role);
    article.appendChild(node('p', '', message.text));
    (message.links || []).forEach(function (link) {
      var sources = node('div', 'la-links');
      var anchor = node('a', '', link.t);
      anchor.href = link.u;
      sources.appendChild(anchor);
      article.appendChild(sources);
    });
    refs.messages.appendChild(article);
    refs.messages.scrollTop = refs.messages.scrollHeight;
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
    input.placeholder = 'Message Lake...';
    input.setAttribute('enterkeyhint', 'send');
    input.setAttribute('aria-label', 'Message Lake');
    var submit = node('button', 'la-send');
    submit.type = 'submit';
    submit.setAttribute('aria-label', 'Send message');
    submit.appendChild(uiIcon('send'));
    var voiceButton = node('button', 'la-voice');
    voiceButton.type = 'button'; voiceButton.setAttribute('aria-label', 'Start voice input'); voiceButton.setAttribute('title', 'Voice input'); voiceButton.appendChild(uiIcon('mic'));
    var voiceUnavailable = node('span', 'la-voice-unavailable'); voiceUnavailable.hidden = true; voiceUnavailable.setAttribute('role', 'status'); voiceUnavailable.setAttribute('aria-live', 'polite');
    var voiceStatus = node('div', 'la-voice-status'); voiceStatus.hidden = true; voiceStatus.setAttribute('role', 'status'); voiceStatus.setAttribute('aria-live', 'polite');
    var voiceMessage = node('span', 'la-voice-message');
    var voiceStop = node('button', 'la-voice-stop', 'Stop'); voiceStop.type = 'button';
    var voiceCancel = node('button', 'la-voice-cancel', 'Cancel'); voiceCancel.type = 'button';
    voiceStatus.append(voiceMessage, voiceStop, voiceCancel);
    form.append(voiceStatus, input, voiceUnavailable, voiceButton, submit);
    panel.append(header, messages, form);
    mount.append(panel, launcher);
    refs = { mount: mount, launcher: launcher, panel: panel, close: close, messages: messages, form: form, input: input, voiceButton: voiceButton, voiceUnavailable: voiceUnavailable, voiceStatus: voiceStatus, voiceMessage: voiceMessage, voiceStop: voiceStop, voiceCancel: voiceCancel };

    launcher.addEventListener('click', function () { panel.hidden ? open() : closePanel(true); });
    close.addEventListener('click', function () { closePanel(true); });
    form.addEventListener('submit', send);
    configureVoiceAvailability();
    voiceButton.addEventListener('click', startVoice);
    voiceStop.addEventListener('click', stopVoice);
    voiceCancel.addEventListener('click', cancelVoice);
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
    window.addEventListener('pagehide', cancelVoice);
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
    cancelVoice();
    clearWelcome();
    refs.panel.hidden = true;
    refs.launcher.setAttribute('aria-expanded', 'false');
    refs.mount.classList.remove('la-open');
    if (restoreFocus) refs.launcher.focus({ preventScroll: true });
  }
  function growInput() {
    refs.input.style.height = 'auto';
    refs.input.style.height = Math.min(refs.input.scrollHeight, 120) + 'px';
  }
  function trapTab(event) {
    if (event.key !== 'Tab') return;
    var items = [refs.close, refs.input];
    if (!refs.voiceButton.hidden && !refs.voiceButton.disabled) items.push(refs.voiceButton);
    if (!refs.voiceStatus.hidden) items.push(refs.voiceStop, refs.voiceCancel);
    items.push(refs.form.querySelector('.la-send'));
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
      draw({ role: 'bot', text: welcomeText });
      welcomeText = '';
      hasWelcomed = true;
    }, reducedMotion ? 350 : 850);
  }
  function send(event) {
    event.preventDefault();
    var query = refs.input.value.trim();
    if (!query) return;
    if (welcomeTimer) {
      window.clearTimeout(welcomeTimer);
      welcomeTimer = null;
      if (welcomeTyping) welcomeTyping.remove();
      welcomeTyping = null;
      draw({ role: 'bot', text: welcomeText });
      welcomeText = '';
      hasWelcomed = true;
    }
    refs.input.value = '';
    growInput();
    draw({ role: 'user', text: query });
    var typing = node('div', 'la-typing');
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-label', 'Lake is typing');
    var dots = node('span', 'la-typing-dots');
    for (var i = 0; i < 3; i++) dots.appendChild(node('i'));
    typing.appendChild(dots);
    refs.messages.appendChild(typing);
    refs.messages.scrollTop = refs.messages.scrollHeight;
    var started = Date.now();
    var assistantApi = (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/chat';
    fetch(assistantApi, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, locale: /^sw(?:-|$)/i.test(lang()) ? 'sw' : 'en' })
    }).then(function (response) {
      if (!response.ok) throw new Error('Assistant request unavailable.');
      return response.json();
    }).then(function (payload) {
      var answerText = String(payload && payload.answer || '').trim();
      if (!answerText) throw new Error('Assistant returned an empty reply.');
      var elapsed = Date.now() - started;
      return new Promise(function (resolve) { window.setTimeout(resolve, Math.max(0, 320 - elapsed)); }).then(function () {
        typing.remove();
        var links = Array.isArray(payload.sources) ? payload.sources.filter(function (source) {
          return source && typeof source.title === 'string' && /^https:\/\/www\.lakeoilgroup\.com\//i.test(source.url || '');
        }).map(function (source) { return { t: source.title, u: source.url }; }) : [];
        draw({ role: 'bot', text: answerText, links: links });
        var noEvidence = payload.status === 'no_evidence' || payload.grounded === false;
        if (window.LakeAnalytics && window.LakeAnalytics.track) window.LakeAnalytics.track(noEvidence ? 'CHAT_NO_MATCH' : 'CHAT_QUESTION', { page: location.pathname, language: lang(), query: query.slice(0, 300) });
        if (noEvidence && window.LAKE_API_BASE) fetch(window.LAKE_API_BASE.replace(/\/$/, '') + '/api/public/assistant/unanswered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: query.slice(0, 300), page: location.pathname, language: lang() }), keepalive: true }).catch(function () {});
      });
    }).catch(function () {
      typing.remove();
      draw({ role: 'bot', text: 'Lake Assistant is temporarily unavailable. Please try again shortly.' });
    });
  }
  function recognitionConstructor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
  function correctVoiceCompanyNames(text, confidence) {
    if (!Number.isFinite(confidence) || confidence < 0.78) return text;
    var normalized = norm(text);
    if (/^(?:(?:tell me about|what is|who is|information about|about) (?:the )?)?leg group$/.test(normalized)) {
      return String(text).replace(/\bleg group\b/i, 'Lake Group');
    }
    return String(text).replace(/\blake avation\b/i, 'Lake Aviation');
  }
  function canRecordLocally() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext)); }
  function voiceEndpoint(path) { return (window.LAKE_API_BASE ? window.LAKE_API_BASE.replace(/\/$/, '') : '') + '/api/assistant/' + path; }
  function configureVoiceAvailability() {
    var nativeAvailable = !!recognitionConstructor();
    var localCaptureAvailable = canRecordLocally();
    refs.voiceButton.hidden = false;
    refs.voiceButton.disabled = !nativeAvailable;
    refs.voiceButton.title = nativeAvailable ? 'Voice input' : 'Checking private voice transcription…';
    refs.voiceButton.setAttribute('aria-label', nativeAvailable ? 'Start voice input' : 'Checking private voice transcription availability');
    if (!localCaptureAvailable) {
      if (!nativeAvailable) setVoiceUnavailable('Voice input is unavailable in this browser or on this device.');
      return;
    }
    if (!nativeAvailable) refs.voiceButton.disabled = true;
    fetch(voiceEndpoint('voice-health'), { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('Voice service unavailable.');
      return response.json();
    }).then(function (payload) {
      voiceState.localReady = !!(payload && payload.ready);
      if (voiceState.localReady) {
        if (!nativeAvailable) refs.voiceButton.disabled = false;
        refs.voiceButton.title = nativeAvailable ? 'Voice input (local transcription fallback available)' : 'Private voice input (audio is transcribed on this PC)';
        refs.voiceButton.setAttribute('aria-label', nativeAvailable ? 'Start voice input' : 'Start private voice input');
      } else if (!nativeAvailable) setVoiceUnavailable('Private voice transcription is not ready on this device. You can type your message.');
    }).catch(function () {
      if (!nativeAvailable) setVoiceUnavailable('Private voice transcription could not be reached. You can type your message.');
    });
  }
  function setVoiceUnavailable(message) {
    refs.voiceButton.hidden = true;
    refs.voiceButton.disabled = true;
    refs.voiceButton.title = message;
    refs.voiceButton.setAttribute('aria-label', message);
    refs.voiceUnavailable.textContent = message;
    refs.voiceUnavailable.hidden = false;
  }
  function voiceUi(message, visible) {
    var statusHidden = refs.voiceStatus.hidden;
    refs.voiceStatus.hidden = !visible;
    refs.voiceMessage.textContent = message || '';
    refs.voiceButton.classList.toggle('is-listening', !!(visible && voiceState.active));
    refs.voiceButton.setAttribute('aria-label', voiceState.active ? 'Listening. Stop or cancel voice input.' : voiceState.localReady && !recognitionConstructor() ? 'Start private voice input' : refs.voiceButton.disabled ? 'Voice input unavailable' : 'Start voice input');
    refs.voiceButton.setAttribute('aria-pressed', voiceState.active ? 'true' : 'false');
    refs.voiceStop.disabled = !voiceState.active || !!voiceState.pending;
    if (statusHidden !== refs.voiceStatus.hidden) growInput();
  }
  function renderVoiceDraft(includeInterim) {
    var finalText = voiceState.finalText;
    var interimText = includeInterim ? voiceState.interimText : '';
    var recognized = finalText + (finalText && interimText ? ' ' : '') + interimText;
    var separator = voiceState.baseText && recognized && !/\s$/.test(voiceState.baseText) ? ' ' : '';
    refs.input.value = voiceState.baseText + separator + recognized;
    growInput();
  }
  function clearRecognitionTimer() {
    window.clearTimeout(voiceState.recognitionTimer);
    voiceState.recognitionTimer = null;
  }
  function waitForRecognitionEnd(session, delay) {
    clearRecognitionTimer();
    voiceState.recognitionTimer = window.setTimeout(function () {
      if (session !== voiceState.session || voiceState.submitted || voiceState.mode !== 'native') return;
      finishVoice(session);
    }, delay);
  }
  function finishVoice(session) {
    if (session !== voiceState.session || voiceState.submitted) return;
    clearRecognitionTimer();
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    voiceState.submitted = true;
    // A browser may stop before delivering a final result. Keep its actual interim
    // transcript as an editable draft rather than dropping recognized words.
    var mode = voiceState.mode;
    var finalText = (voiceState.finalText || voiceState.interimText).trim();
    voiceState.finalText = finalText;
    voiceState.active = false; voiceState.pending = false; voiceState.mode = '';
    refs.input.readOnly = false;
    voiceState.recognition = null; voiceState.recorder = null; voiceState.interimText = '';
    if (finalText) {
      renderVoiceDraft(false);
      var languageLabel = voiceState.detectedLanguage === 'sw' ? ' in Kiswahili' : voiceState.detectedLanguage === 'en' ? ' in English' : '';
      voiceUi('Transcription added' + (mode === 'local' ? languageLabel : '') + ' to your draft. Review it before sending.', true);
    } else {
      refs.input.value = voiceState.baseText; growInput();
      voiceUi('No speech was recognized. You can try again or type your message.', true);
    }
    window.setTimeout(function () { if (session === voiceState.session && !voiceState.active && !voiceState.pending) voiceUi('', false); }, finalText ? 1200 : 2500);
  }
  function resetVoiceDraft(message) {
    clearRecognitionTimer();
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    voiceState.active = false; voiceState.pending = false; voiceState.recognition = null; voiceState.recorder = null; voiceState.mode = ''; voiceState.interimText = '';
    refs.input.readOnly = false;
    refs.input.value = voiceState.baseText; growInput();
    if (message) voiceUi(message, true);
  }
  function startVoice() {
    if (voiceState.active || voiceState.pending || voiceState.recognition || voiceState.recorder || refs.voiceButton.disabled) return;
    var session = ++voiceState.session;
    voiceState.finalText = ''; voiceState.interimText = ''; voiceState.detectedLanguage = ''; voiceState.baseText = refs.input.value; voiceState.submitted = false; voiceState.locale = speechLocale();
    var Constructor = recognitionConstructor();
    if (Constructor) startNativeVoice(Constructor, session);
    else if (voiceState.localReady && canRecordLocally()) startLocalVoice(session);
    else voiceUi('Voice input is unavailable. You can type your message instead.', true);
  }
  function startNativeVoice(Constructor, session) {
    var recognition;
    try { recognition = new Constructor(); } catch (_) { voiceUi('Voice input could not start in this browser. You can type your message instead.', true); return; }
    voiceState.recognition = recognition; voiceState.mode = 'native';
    recognition.lang = voiceState.locale; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1;
    recognition.onstart = function () {
      if (session !== voiceState.session || voiceState.submitted) return;
      window.clearTimeout(voiceState.timer); voiceState.timer = null;
      voiceState.active = true; refs.input.readOnly = true;
      voiceUi('Listening. This browser’s speech-recognition service may process audio.', true);
      voiceState.timer = window.setTimeout(stopVoice, 20_000);
    };
    recognition.onresult = function (event) {
      if (session !== voiceState.session || voiceState.submitted) return;
      var finalParts = [], interimParts = [], finalConfidence = Infinity;
      for (var i = 0; i < event.results.length; i++) {
        var result = event.results[i], text = result && result[0] && result[0].transcript || '';
        if (result.isFinal) {
          finalParts.push(text);
          var confidence = result && result[0] && result[0].confidence;
          if (Number.isFinite(confidence)) finalConfidence = Math.min(finalConfidence, confidence);
          else finalConfidence = NaN;
        } else interimParts.push(text);
      }
      voiceState.finalText = correctVoiceCompanyNames(finalParts.join(' ').trim(), finalConfidence);
      voiceState.interimText = interimParts.join(' ').trim();
      renderVoiceDraft(true);
      if (voiceState.active) voiceUi(voiceState.interimText ? 'Recognizing speech…' : 'Listening. This browser’s speech-recognition service may process audio.', true);
      else {
        voiceUi('Finishing transcription…', true);
        waitForRecognitionEnd(session, 4000);
      }
    };
    recognition.onspeechend = function () {
      if (session !== voiceState.session || voiceState.submitted) return;
      voiceState.active = false;
      voiceUi('Finishing transcription…', true);
      // speechend only signals silence; result/end events may still follow.
      waitForRecognitionEnd(session, 5000);
    };
    recognition.onerror = function (event) {
      if (session !== voiceState.session || voiceState.submitted) return;
      voiceState.submitted = true;
      clearRecognitionTimer(); window.clearTimeout(voiceState.timer); voiceState.timer = null;
      var errorCode = String(event && event.error || 'unknown');
      var messages = { 'not-allowed': 'Microphone permission was denied. Allow microphone access or type your message.', 'service-not-allowed': voiceState.localReady ? 'Browser speech is unavailable. Press the microphone again to transcribe privately on this PC.' : 'The browser speech service is unavailable. You can type your message.', 'audio-capture': 'No microphone is available. Connect a microphone or type your message.', 'no-speech': 'No speech was detected. You can try again or type your message.', 'language-not-supported': 'This browser does not support that language. Choose another language or type your message.', 'aborted': 'Voice recognition was interrupted before a transcript was ready. Try again or type your message.', 'bad-grammar': 'The browser rejected the speech-recognition grammar. You can type your message.', 'phrases-not-supported': 'This browser cannot use the optional Lake name hints. Try again or type your message.', network: voiceState.localReady ? 'Browser speech is offline. Press the microphone again to transcribe privately on this PC.' : 'The browser speech service could not connect. Try again or type your message.' };
      if (errorCode === 'phrases-not-supported') {
        // Phrase hints are an optimization only. Some implementations report this
        // error but can still recognize speech, so do not discard the recording.
        voiceUi(voiceState.active ? 'Listening. This browser’s speech-recognition service may process audio.' : 'Finishing transcription…', true);
        return;
      }
      resetVoiceDraft(messages[errorCode] || 'Speech recognition failed (' + errorCode + '). You can try again or type your message.');
      window.setTimeout(function () { if (session === voiceState.session && !voiceState.active) voiceUi('', false); }, 4500);
    };
    recognition.onend = function () { if (session === voiceState.session && !voiceState.submitted) finishVoice(session); };
    voiceUi('Requesting microphone…', true); refs.input.readOnly = true;
    voiceState.timer = window.setTimeout(function () {
      if (session !== voiceState.session || voiceState.submitted || voiceState.active) return;
      voiceState.submitted = true;
      try { recognition.abort(); } catch (_) { /* Timed-out recognizers may already have stopped. */ }
      resetVoiceDraft('Voice recognition did not start. Check microphone permission and try again.');
    }, 12_000);
    try { recognition.start(); } catch (error) { voiceState.submitted = true; resetVoiceDraft('Voice input could not start (' + String(error && error.name || 'unknown error') + '). Check microphone permission or type your message.'); }
  }
  async function startLocalVoice(session) {
    voiceState.mode = 'local'; voiceState.active = true; refs.input.readOnly = true;
    voiceUi('Requesting microphone permission…', true);
    var stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (error) {
      if (session !== voiceState.session) return;
      voiceState.submitted = true;
      var message = error && error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access or type your message.' : error && error.name === 'NotFoundError' ? 'No microphone is available. Connect a microphone or type your message.' : 'The microphone could not be started. Check browser permissions or type your message.';
      resetVoiceDraft(message); return;
    }
    if (session !== voiceState.session) { stream.getTracks().forEach(function (track) { track.stop(); }); return; }
    voiceState.stream = stream; voiceState.chunks = [];
    try {
      var options = {};
      var supportedTypes = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4'];
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        var supportedType = supportedTypes.find(function (type) { return MediaRecorder.isTypeSupported(type); });
        if (supportedType) options.mimeType = supportedType;
      }
      var recorder = new MediaRecorder(stream, options);
      voiceState.recorder = recorder; voiceState.active = true;
      recorder.ondataavailable = function (event) { if (event.data && event.data.size && session === voiceState.session) voiceState.chunks.push(event.data); };
      recorder.onerror = function () { if (session !== voiceState.session) return; stopVoiceTracks(); voiceState.submitted = true; resetVoiceDraft('Microphone recording failed. Try again or type your message.'); };
      recorder.onstop = function () {
        if (session !== voiceState.session || voiceState.submitted) { stopVoiceTracks(); return; }
        window.clearTimeout(voiceState.timer); voiceState.timer = null; stopVoiceTracks(); voiceState.active = false; voiceState.pending = true;
        refs.input.readOnly = true; voiceUi('Transcribing privately on this PC…', true);
        var recording = new Blob(voiceState.chunks, { type: recorder.mimeType || (voiceState.chunks[0] && voiceState.chunks[0].type) || 'application/octet-stream' }); voiceState.chunks = [];
        if (!recording.size) { voiceState.submitted = true; resetVoiceDraft('No audio was captured. Check microphone access and try again.'); return; }
        encodeWav(recording).then(function (wav) { return sendLocalRecording(session, wav); }).catch(function (error) {
          if (session !== voiceState.session || voiceState.submitted) return;
          voiceState.submitted = true; resetVoiceDraft(error && error.message || 'The recording could not be prepared. Try again or type your message.');
        });
      };
      recorder.start(250);
      voiceUi('Recording on this device. Stop when you’re done (30 seconds maximum). Audio is transcribed privately on this PC.', true);
      voiceState.timer = window.setTimeout(stopVoice, 30_000);
    } catch (_) {
      stopVoiceTracks(); voiceState.submitted = true; resetVoiceDraft('The microphone recorder is unavailable in this browser. You can type your message.');
    }
  }
  function stopVoiceTracks() {
    if (voiceState.stream) voiceState.stream.getTracks().forEach(function (track) { track.stop(); });
    voiceState.stream = null;
  }
  async function encodeWav(recording) {
    var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContextConstructor();
    var audio;
    try { audio = await context.decodeAudioData(await recording.arrayBuffer()); }
    finally { await context.close().catch(function () {}); }
    if (!audio.length || audio.duration > 30.5) throw new Error('Keep voice messages to 30 seconds or less.');
    var targetRate = 16_000, count = Math.ceil(audio.length * targetRate / audio.sampleRate);
    if (!count || count > 30 * targetRate) throw new Error('Keep voice messages to 30 seconds or less.');
    var pcm = new ArrayBuffer(44 + count * 2), view = new DataView(pcm);
    function writeAscii(offset, value) { for (var i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
    writeAscii(0, 'RIFF'); view.setUint32(4, pcm.byteLength - 8, true); writeAscii(8, 'WAVE'); writeAscii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeAscii(36, 'data'); view.setUint32(40, count * 2, true);
    var channels = []; for (var channel = 0; channel < audio.numberOfChannels; channel++) channels.push(audio.getChannelData(channel));
    var ratio = audio.sampleRate / targetRate;
    for (var sample = 0; sample < count; sample++) {
      var begin = Math.floor(sample * ratio), end = Math.min(audio.length, Math.floor((sample + 1) * ratio)), sum = 0, total = 0;
      if (end <= begin) end = Math.min(audio.length, begin + 1);
      for (var c = 0; c < channels.length; c++) for (var j = begin; j < end; j++) { sum += channels[c][j]; total++; }
      var value = Math.max(-1, Math.min(1, total ? sum / total : 0));
      view.setInt16(44 + sample * 2, value < 0 ? value * 32768 : value * 32767, true);
    }
    return new Blob([pcm], { type: 'audio/wav' });
  }
  function sendLocalRecording(session, wav) {
    if (wav.size > 1_000_000) return Promise.reject(new Error('The recording is too large. Please use a shorter voice message.'));
    var body = new FormData(); body.append('language', 'auto'); body.append('audio', wav, 'lake-voice.wav');
    var controller = new AbortController(); voiceState.controller = controller;
    return fetch(voiceEndpoint('transcribe'), { method: 'POST', credentials: 'same-origin', body: body, signal: controller.signal }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'Private transcription is unavailable. You can type your message.');
        if (session !== voiceState.session || voiceState.submitted) return;
        voiceState.controller = null; voiceState.finalText = String(payload.text || '').trim(); voiceState.detectedLanguage = String(payload.language || '').toLowerCase(); finishVoice(session);
      });
    }).finally(function () { if (session === voiceState.session) voiceState.controller = null; });
  }
  function stopVoice() {
    if (!voiceState.active || voiceState.pending) return;
    if (voiceState.mode === 'native' && voiceState.recognition) {
      voiceState.active = false;
      voiceUi('Finishing transcription…', true);
      waitForRecognitionEnd(voiceState.session, 5000);
      try { voiceState.recognition.stop(); } catch (_) { finishVoice(voiceState.session); }
    } else if (voiceState.mode === 'local' && voiceState.recorder && voiceState.recorder.state !== 'inactive') {
      voiceState.active = false;
      voiceUi('Finishing transcription…', true);
      try { voiceState.recorder.stop(); } catch (_) { stopVoiceTracks(); voiceState.submitted = true; resetVoiceDraft('Recording could not be stopped. You can type your message.'); }
    }
  }
  function cancelVoice() {
    if (!refs.voiceStatus) return;
    var recognition = voiceState.recognition, recorder = voiceState.recorder;
    var hadVoice = !!(recognition || recorder || voiceState.active || voiceState.pending);
    clearRecognitionTimer();
    voiceState.session++; voiceState.active = false; voiceState.pending = false; voiceState.recognition = null; voiceState.recorder = null; voiceState.mode = ''; voiceState.finalText = ''; voiceState.interimText = ''; voiceState.chunks = []; voiceState.submitted = true;
    window.clearTimeout(voiceState.timer); voiceState.timer = null;
    if (voiceState.controller) voiceState.controller.abort(); voiceState.controller = null;
    if (recognition) { recognition.onend = recognition.onerror = recognition.onresult = recognition.onspeechend = recognition.onstart = null; try { recognition.abort(); } catch (_) {} }
    if (recorder) { recorder.onstop = recorder.onerror = recorder.ondataavailable = null; try { if (recorder.state !== 'inactive') recorder.stop(); } catch (_) {} }
    stopVoiceTracks(); refs.input.readOnly = false;
    if (hadVoice) refs.input.value = voiceState.baseText;
    voiceState.baseText = ''; growInput(); voiceUi('', false);
  }
  window.LakeAssistantV2={classify:intent,entityFor:entity,answer:function(q){return knowledge().then(function(){return reply(q);});},resetConversation:function(){state=newConversationState();},getConversationState:function(){return{currentEntity:state.currentEntity&&state.currentEntity.name||null,currentIntent:state.currentIntent,currentTopic:state.currentTopic,previousQuery:state.previousQuery,recentQuestionCount:state.recentQuestions.length};},getKnowledgeMetadata:function(){return kbMetadata&&kbMetadata.audit||null;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  document.addEventListener('pointerdown',function(e){if(refs.panel&&!refs.panel.hidden&&!refs.mount.contains(e.target))closePanel(false);});
})();
