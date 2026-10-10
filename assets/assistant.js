/* Lake Group Assistant V2 — local, deterministic, approved-content only. */
(function () {
  'use strict';
  if (window.LakeAssistantV2 || window.LAKE_ASSISTANT_ENABLED === false) return;
  var refs = {}, index, assets, companies = [], kbMetadata = null;
  var groupEntity = { name: 'Lake Group', route: 'about.html', aliases: ['Lake Group', 'Lake Oil Group'] };
  var routes = {
    CONTACT: ['contact.html', 'Contact Lake Group'], CAREERS: ['careers.html', 'Careers at Lake Group'],
    STATIONS: ['station-locator.html', 'Station locator'], COUNTRIES: ['about.html', 'Where Lake Group operates'],
    SUSTAINABILITY: ['csr.html', 'CSR & sustainability'], HISTORY: ['history.html', 'Lake Group history'],
    LEADERSHIP: ['leadership.html', 'Lake Group leadership'], GROUP_COMPANIES: ['index.html', 'Lake Group companies']
  };
  var state = newConversationState();
  function page(){return location.pathname.split('/').pop()||'index.html';} function lang(){return window.LakeI18n&&window.LakeI18n.current||'en';}
  function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function words(s){var stop=/^(a|an|the|is|are|do|does|what|where|when|why|who|how|can|could|would|i|we|you|about|tell|me|more|detail|details|of|to|for|in|on|at|and|their|they|them|it|its|there|that|this|offer|offers|provide|provides|give|company|group|please|lake)$/;return norm(s).split(' ').filter(function(w){return w.length>1&&!stop.test(w);});}
  function newConversationState(){return{currentEntity:null,currentIntent:null,currentTopic:null,previousQuery:'',previousResultIds:[],recentQuestions:[],recentVariants:{},variantCursor:{},currentPage:page(),language:lang()};}
  function findEntity(q){var n=' '+norm(q)+' ',matches=[];if(/\blake oil group\b/.test(n))return groupEntity;companies.forEach(function(company){(company.aliases||[company.name]).forEach(function(alias){var a=norm(alias);if(a.length>2&&n.indexOf(' '+a+' ')>-1)matches.push({company:company,length:a.length});});});matches.sort(function(a,b){return b.length-a.length;});if(!matches.length)return/\b(lake group|the group)\b/.test(n)?groupEntity:null;var longest=matches.filter(function(m){return m.length===matches[0].length;});var unique=[];longest.forEach(function(m){if(!unique.some(function(x){return x.company.route===m.company.route;}))unique.push(m);});return unique.length===1?unique[0].company:{ambiguous:true,companies:unique.map(function(m){return m.company;})};}
  function intent(q,e){var n=norm(q);if(/^(bye|goodbye|good bye|see you|talk to you later|kwaheri)[!,. ]*$/.test(n))return'GOODBYE';if(/^(hi|hello|hey|good morning|good afternoon|good evening|jambo|habari)( again)?[!,. ]*$/.test(n))return'GREETING';if(/\b(thanks?|thank you|asante|merci|gracias)\b/i.test(q))return'THANKS';if(/\b(help|what can you|how can you)\b/i.test(q))return'HELP';if(/\b(clarify|what do you mean|which one|can you explain that)\b/i.test(q))return'CLARIFICATION';if(/\b(contact|phone|telephone|email|e-mail|call|reach|address|headquarters)\b/i.test(q))return'CONTACT';if(/\b(job|jobs|career|careers|apply|vacanc|recruit)\b/i.test(q))return'CAREERS';if(/\b(stations?|fuel stations?|dealers?|nearest fuel|how many .* stations?)\b/i.test(q))return'STATIONS';if(/\b(sustainab\w*|environment\w*|clean cooking|csr|communities|community)\b/i.test(q))return'SUSTAINABILITY';if(/\b(leader|leadership|chairman|ceo|founder|director|management)\b/i.test(q))return'LEADERSHIP';if(/\b(history|founded|founding|established|started|timeline)\b/i.test(q))return'HISTORY';if(/\b(news|media|press|announcement)\b/i.test(q))return'NEWS';if(/\b(countries|country|markets|operate|operations|where does .* operate)\b/i.test(q))return'COUNTRIES';if(/\b(where|location|located|based|airport|port|head office|facility|facilities)\b/i.test(q))return'LOCATION';if(/\b(product|products|manufacture|manufactures|make|makes|produce|produces|model|range)\b/i.test(q))return'PRODUCT_INFO';if(/\b(service|services|provide|provides|business|offer|offers|what is .* for)\b/i.test(q))return'SERVICE_INFO';if(/\b(tell me more|more detail|more about|elaborate|expand on|in detail|detailed)\b/i.test(q)||/^(more|details|tell me more)$/.test(n))return'MORE_INFO';if(/\b(companies|subsidiaries|business verticals|businesses under|group companies)\b/i.test(q))return'GROUP_COMPANIES';if(/\b(company|companies|tell me about|who is|what is|about)\b/i.test(q))return'COMPANY_INFO';if(e)return'COMPANY_INFO';return'UNKNOWN';}
  function hasPronounReference(q){return/\b(it|they|them|their|its|there|those|that)\b|^(and|also|what about)\b/i.test(q);}
  function isGroupReference(q){return/\b(lake group|lake oil group|the group|group wide|group-wide)\b/i.test(q);}
  function usesRecentContext(q,i){var tokens=words(q);return!!state.currentEntity&&(hasPronounReference(q)||tokens.length<=3||i==='MORE_INFO'||/^what about\b/i.test(q));}
  function chooseVariant(key,options){var used=state.recentVariants[key]||[],cursor=state.variantCursor[key]||0,chosen=null;for(var i=0;i<options.length;i++){var position=(cursor+i)%options.length;if(used.indexOf(position)<0){chosen=position;break;}}if(chosen===null)chosen=cursor%options.length;state.variantCursor[key]=(chosen+1)%options.length;state.recentVariants[key]=(used.concat(chosen)).slice(-2);return options[chosen];}
  function script(src){return new Promise(function(done){var s=document.createElement('script');s.src=src;s.async=true;s.onload=s.onerror=done;document.head.appendChild(s);});}
  function knowledge(){if(assets)return assets;assets=Promise.resolve().then(function(){return window.FlexSearch?null:script('assets/vendor/flexsearch/flexsearch.bundle.min.js');}).then(function(){return window.__LAKE_ASSISTANT_KB__?null:script('assets/assistant-kb.js');}).then(function(){var kb=window.__LAKE_ASSISTANT_KB__,pack=kb&&kb.langs&&(kb.langs[lang()]||kb.langs.en),docs=pack&&pack.docs||[];kbMetadata=kb||null;companies=kb&&kb.entities||[];index={docs:docs,flex:window.FlexSearch&&new window.FlexSearch.Index({tokenize:'forward',charset:'latin:simple'})};if(index.flex)docs.forEach(function(d,i){index.flex.add(i,[d.title||d.t,d.entity,(d.aliases||[]).join(' '),d.keywords||d.k,d.text||d.s].join(' '));});return index;});return assets;}
  function entity(q){var found=findEntity(q);if(found)return found;return usesRecentContext(q,intent(q,null))?state.currentEntity:null;}
  function categoryFor(i){return{CONTACT:'contact',CAREERS:'careers',STATIONS:'stations',COUNTRIES:'locations',LOCATION:'locations',SUSTAINABILITY:'sustainability',LEADERSHIP:'leadership',HISTORY:'history',PRODUCT_INFO:'products',SERVICE_INFO:'services',COMPANY_INFO:'overview',MORE_INFO:state.currentTopic}[i]||null;}
  function score(d,q,i,e){var title=norm(d.title||d.t),text=norm(d.text||d.s),terms=words(q),score=0,route=e&&e.route,category=categoryFor(i);if(i==='GROUP_COMPANIES'&&d.id==='directory:companies')score+=120;if(e===groupEntity){if(d.entityType==='company')score-=85;if(i==='COMPANY_INFO'&&d.page==='about.html')score+=35;}else if(e){if(d.page===route)score+=75;else if(d.entityType==='group')score-=30;else score-=85;}else if(d.entityType==='company'&&i!=='GROUP_COMPANIES')score-=15;if(e&&e!==groupEntity&&i==='COMPANY_INFO'&&d.page===route)score+=Math.max(0,100-(Number(d.ordinal)||0)*12);if(i==='CONTACT'&&/headquarters|group address/i.test(d.title||d.t)&&/phone|email|address|dar es salaam/i.test(d.text||d.s))score+=24;if(i==='STATIONS'&&/how many|number of|count/i.test(q)&&/\d/.test(d.title||d.t))score+=30;if(category){score+=d.category===category?38:0;if(category==='products'&&/products|manufactur|produce/.test(d.category||''))score+=12;if(category==='locations'&&/location|station/.test(d.category||''))score+=10;}terms.forEach(function(word){if(title.indexOf(word)>-1)score+=12;if(norm(d.keywords||d.k).indexOf(word)>-1)score+=6;if(text.indexOf(word)>-1)score+=3;});score+=(Number(d.priority)||0)/20;if(d.verification==='VERIFIED'||d.f===1)score+=3;return score;}
  function retrieve(q,i,e,more){if(!index)return null;var terms=words(q),category=categoryFor(i),specific=norm(q).match(/\b(certification|certificate|licence|license|permit|accreditation|capacity|tonnage|registration)\b/g)||[],all=index.docs,ranked=all.map(function(d){var corpus=norm((d.title||d.t)+' '+(d.keywords||d.k)+' '+(d.text||d.s)),overlap=terms.some(function(w){return corpus.indexOf(w)>-1;}),supportedSpecific=specific.every(function(w){return corpus.indexOf(w)>-1;});return{d:d,s:score(d,q,i,e),overlap:overlap,supportedSpecific:supportedSpecific};}).filter(function(item){return item.s>0&&item.supportedSpecific;}).sort(function(a,b){return b.s-a.s;});if(more)ranked=ranked.filter(function(item){return state.previousResultIds.indexOf(item.d.id)<0;});var best=ranked[0];if(e&&best&&!best.overlap&&!(terms.length===0&&category&&best.d.category===category))return null;return best&&best.s>=(e?25:14)?best.d:null;}
  function quick(){return[];}
  function snippets(text,query,category,detailed){var sentences=String(text||'').match(/[^.!?]+[.!?]?/g)||[],terms=words(query),ranked=sentences.map(function(s,n){var value=norm(s),score=0;terms.forEach(function(w){if(value.indexOf(w)>-1)score+=2;});if(category==='products'&&/product|manufactur|produce|pipe|steel|range|model|cylinder|board|concrete|vehicle/i.test(s))score+=3;if(category==='services'&&/service|provide|supply|logistic|transport|operation|solution|capabilit/i.test(s))score+=3;if(category==='locations'&&/located|based|location|Tanzania|Kenya|Uganda|Zambia|Dar es Salaam|Kibaha|airport|port/i.test(s))score+=3;return{s:String(s).trim(),n:n,score:score};}).filter(function(x){return x.s.length>28;}).sort(function(a,b){return b.score-a.score||a.n-b.n;});var chosen=ranked.slice(0,detailed?3:2).sort(function(a,b){return a.n-b.n;}).map(function(x){return x.s;});var result=chosen.join(' ').replace(/\s+/g,' ').trim();if(result.length>380)result=result.slice(0,377).replace(/\s+\S*$/,'')+'…';return result;}
  var variants={GREETING:['Hi! What would you like to know about Lake Group?','Hello! I can help you find information across Lake Group. What are you looking for?','Hey there — what can I help you look up today?','Welcome! Ask me about our companies, products, services or operations.','Good to hear from you. What would you like to explore?','Hello again! What would you like to know?','Hi there. Which part of Lake Group can I help with?','Hey! I’m here to help you find information on Lake Group.','Welcome back. What can I look up for you?','Good day! What Lake Group information are you looking for?','Jambo! What would you like to know about Lake Group?','Hello — tell me what you’re looking for and I’ll find the published information.'],THANKS:['You’re welcome. What else can I help you find?','Glad I could help. Is there anything else you’d like to know?','Anytime. What would you like to look into next?'],GOODBYE:['Goodbye — come back any time you need information about Lake Group.','Take care. I’ll be here if you have another question.','See you next time!'],HELP:['Of course. Ask me about Lake Group companies, products, services, locations, careers or published initiatives.','I can help look up company information, products, services, operations, careers and contact details. What do you need?','Sure — tell me which Lake Group topic or company you’re interested in.'],CLARIFICATION:['Could you tell me which Lake Group company or topic you mean?','I’m not certain which company you’re referring to. Which one should I check?','Can you give me a little more context so I can find the right published information?'],UNKNOWN:["I'm not seeing a confirmed answer for that. You can check the relevant Lake Group page for more details.","I couldn't verify that from the published information I have. The Lake Group website may have more detail.","I don't have a confirmed published answer for that yet. Please check the relevant Lake Group page."],FACT:['','The current page notes: ','Lake Group’s published information says: ','According to the current Lake Group page: '],MORE_INFO:['Here’s a little more: ','A further detail: ','The page also notes: ']};
  function compose(q,i,e){if(i==='GREETING'||i==='THANKS'||i==='GOODBYE'||i==='HELP'||i==='CLARIFICATION')return{text:chooseVariant(i,variants[i]),actions:quick()};if(i==='UNKNOWN'&&!e)return{text:chooseVariant('UNKNOWN',variants.UNKNOWN),nomatch:true};var more=i==='MORE_INFO',effectiveIntent=more&&state.currentIntent?state.currentIntent:i,category=categoryFor(effectiveIntent),d=retrieve(q,effectiveIntent,e,more);if(!d&&more)d=retrieve(state.previousQuery,effectiveIntent,e,false);if(!d)return{text:chooseVariant('UNKNOWN',variants.UNKNOWN),nomatch:true};var answer=snippets(d.text||d.s,q,category,more);if(/how many|number of|what is the count/i.test(q)&&/\d/.test(d.title||d.t)&&/station|truck|country|employee|nationalit|capacity|litre|tonne/i.test(d.title||d.t))answer=d.title||d.t;if(!answer)answer=String(d.text||d.s||'').slice(0,240);var repeated=state.recentQuestions.some(function(item){return norm(item.query)===norm(q);});var prefix=chooseVariant(more?'MORE_INFO':'FACT',variants[more?'MORE_INFO':'FACT']);var result={text:prefix+answer,links:[{u:d.page||d.u||'index.html',t:d.title||d.t||'Lake Group information'}],id:d.id};if(repeated)result.text=chooseVariant('FACT',variants.FACT)+answer;return result;}
  function resolve(q){var explicit=findEntity(q),e=explicit&&explicit.ambiguous?null:explicit;if(!e&&usesRecentContext(q,intent(q,null)))e=state.currentEntity;var i=intent(q,e);if(explicit&&explicit.ambiguous)return{answer:{text:'I found more than one possible match. Which company did you mean?',nomatch:false},entity:null,intent:'CLARIFICATION'};if(!e&&hasPronounReference(q)&&state.currentEntity===null)return{answer:{text:chooseVariant('CLARIFICATION',variants.CLARIFICATION),nomatch:false},entity:null,intent:'CLARIFICATION'};return{answer:compose(q,i,e),entity:e,intent:i};}
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
      var bubble = document.createElementNS(svg.namespaceURI, 'path');
      bubble.setAttribute('d', 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 .9-4.1A7.5 7.5 0 1 1 20 11.5Z');
      svg.appendChild(bubble);
      for (var i = 0; i < 3; i++) {
        var dot = document.createElementNS(svg.namespaceURI, 'circle');
        dot.setAttribute('class', 'la-launcher-dot la-launcher-dot-' + (i + 1));
        dot.setAttribute('cx', 8 + i * 4);
        dot.setAttribute('cy', '12');
        dot.setAttribute('r', '0.7');
        dot.setAttribute('fill', 'currentColor');
        dot.setAttribute('stroke', 'none');
        svg.appendChild(dot);
      }
    } else if (kind === 'close') {
      var x = document.createElementNS(svg.namespaceURI, 'path');
      x.setAttribute('d', 'm18 6-12 12M6 6l12 12');
      svg.appendChild(x);
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
    form.append(input, submit);
    panel.append(header, messages, form);
    mount.append(panel, launcher);
    refs = { mount: mount, launcher: launcher, panel: panel, close: close, messages: messages, form: form, input: input };
    draw({ role: 'bot', text: 'Hello. What would you like to know about Lake Group?' });

    launcher.addEventListener('click', function () { panel.hidden ? open() : closePanel(true); });
    close.addEventListener('click', function () { closePanel(true); });
    form.addEventListener('submit', send);
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
  }
  function open() {
    refs.panel.hidden = false;
    refs.launcher.setAttribute('aria-expanded', 'true');
    refs.mount.classList.add('la-open');
    refs.input.focus({ preventScroll: true });
    knowledge().catch(function () {});
  }
  function closePanel(restoreFocus) {
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
    var items = [refs.close, refs.input, refs.form.querySelector('button')];
    var first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function send(event) {
    event.preventDefault();
    var query = refs.input.value.trim();
    if (!query) return;
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
    knowledge().then(function () {
      var answer = reply(query);
      var found = entity(query) || state.currentEntity;
      var delay = Math.max(650, Math.min(1100, (answer.text || '').length * 5));
      return new Promise(function (resolve) { window.setTimeout(resolve, Math.max(0, delay - (Date.now() - started))); }).then(function () {
        typing.remove();
        state.currentEntity = found;
        state.currentIntent = intent(query, found);
        state.previousQuery = query;
        state.previousResultIds = answer.id ? [answer.id] : [];
        draw(Object.assign({ role: 'bot' }, answer));
        if (window.LakeAnalytics && window.LakeAnalytics.track) window.LakeAnalytics.track(answer.nomatch ? 'CHAT_NO_MATCH' : 'CHAT_QUESTION', { page: location.pathname, language: lang(), query: query.slice(0, 300) });
        if (answer.nomatch && window.LAKE_API_BASE) fetch(window.LAKE_API_BASE.replace(/\/$/, '') + '/api/public/assistant/unanswered', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: query.slice(0, 300), page: location.pathname, language: lang() }), keepalive: true }).catch(function () {});
      });
    }).catch(function () {
      typing.remove();
      draw({ role: 'bot', text: 'I couldn’t load verified information just now. Please try again.' });
    });
  }
  window.LakeAssistantV2={classify:intent,entityFor:entity,answer:function(q){return knowledge().then(function(){return reply(q);});},resetConversation:function(){state=newConversationState();},getConversationState:function(){return{currentEntity:state.currentEntity&&state.currentEntity.name||null,currentIntent:state.currentIntent,currentTopic:state.currentTopic,previousQuery:state.previousQuery,recentQuestionCount:state.recentQuestions.length};},getKnowledgeMetadata:function(){return kbMetadata&&kbMetadata.audit||null;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  document.addEventListener('pointerdown',function(e){if(refs.panel&&!refs.panel.hidden&&!refs.panel.contains(e.target)&&!refs.launcher.contains(e.target)){refs.panel.hidden=true;refs.launcher.setAttribute('aria-expanded','false');refs.mount.classList.remove('la-open');}});
})();
