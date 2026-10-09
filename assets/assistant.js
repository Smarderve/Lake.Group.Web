/* Lake Group Assistant V2 — local, deterministic, approved-content only. */
(function () {
  'use strict';
  if (window.LakeAssistantV2 || window.LAKE_ASSISTANT_ENABLED === false) return;
  var refs = {}, index, assets;
  var state = { currentEntity: null, currentIntent: null, previousQuery: '', previousResultIds: [], currentPage: page(), language: lang() };
  var companies = [
    ['Lake Oil','lake-oil.html',['lakeoil']],['Lake Aviation','lake-aviation.html',['aviation']],['Lake Gas','lake-gas.html',['lakegas']],['Lake Lubes','lake-lubes.html',['lakelubes']],['Lake Building Solutions','lake-buildings.html',['lake buildings']],['Lake Pipes','lake-pipes.html',['lakepipes']],['Lake Steel','lake-steel.html',['lakesteel']],['Lake Cylinders','lake-cylinders.html',['lakecylinders']],['Lake Premix','lake-premix-cement.html',['premix','gccp','gulf concrete']],['Gulf Aggregates','gulf-aggregates.html',['gulfaggregate']],['AFICD','aficd.html',['african inland container depot']],['AILL','aill.html',['african inland logistics limited']],['Lake Trans','lake-trans.html',['laketrans']],['Cross Country Developer','cross-country.html',['cross country']],['Lake Agro','lake-agro.html',['lakeagro']],['Agrinova Tech','agrinova-tech.html',['agrinova']],['Assembly Tech','assembly-tech.html',['assembly']],['NexDrive Motors','nextdrive-motors.html',['nexdrive']]
  ];
  var routes = { CONTACT:['contact.html','Contact Lake Group'], CAREERS:['careers.html','Explore careers'], STATION:['station-locator.html','Find a station'], COUNTRIES:['about.html','Where we operate'], SUSTAINABILITY:['sustainability.html','Sustainability'], HISTORY:['history.html','Our history'], LEADERSHIP:['leadership.html','Leadership'], NEWS:['media-center.html','Media centre'] };
  function page(){return location.pathname.split('/').pop()||'index.html';} function lang(){return window.LakeI18n&&window.LakeI18n.current||'en';}
  function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
  function words(s){var stop=/^(a|an|the|is|are|do|does|what|where|how|can|i|we|you|about|tell|me|more|of|to|for|in|on|and|their|they|them)$/;return norm(s).split(' ').filter(function(w){return w.length>1&&!stop.test(w);});}
  function entity(q){var n=norm(q),hit,score=0;companies.forEach(function(c){[c[0]].concat(c[2]).forEach(function(a){a=norm(a);if(a&&(n.indexOf(a)>-1||n.replace(/ /g,'').indexOf(a.replace(/ /g,''))>-1)&&a.length>score){hit=c;score=a.length;}});});return hit;}
  function intent(q,e){var r=[['GREETING',/^(hi|hello|hey|good (morning|afternoon|evening)|jambo|habari)[!,. ]*$/i],['THANKS',/\b(thanks?|thank you|asante|merci|gracias)\b/i],['HELP',/\b(help|what can you|how can you)\b/i],['CONTACT',/\b(contact|phone|email|e-mail|call|reach)\b/i],['CAREERS',/\b(job|jobs|career|careers|apply|vacanc)/i],['STATION',/\b(station|fuel station|nearest fuel)/i],['SUSTAINABILITY',/\b(sustainab|environment|clean cooking|csr)\b/i],['LEADERSHIP',/\b(leader|leadership|chairman|ceo|founder)\b/i],['HISTORY',/\b(history|founded|established|started)\b/i],['NEWS',/\b(news|media|press)\b/i],['COUNTRIES',/\b(countries|country|operate|operations)\b/i],['LOCATION',/\b(where|location|located|based)\b/i],['PRODUCT_INFO',/\b(product|manufacture|make|produce)\b/i],['SERVICE_INFO',/\b(service|services|provide|do)\b/i],['COMPANY_INFO',/\b(company|companies|tell me about|what is|who is|about)\b/i],['FOLLOW_UP',/\b(they|them|their|it|that|more|there)\b/i]];for(var i=0;i<r.length;i++)if(r[i][1].test(q)&&(r[i][0]!=='FOLLOW_UP'||e||state.currentEntity))return r[i][0];return e?'COMPANY_INFO':'UNKNOWN';}
  function script(src){return new Promise(function(done){var s=document.createElement('script');s.src=src;s.async=true;s.onload=s.onerror=done;document.head.appendChild(s);});}
  function knowledge(){if(assets)return assets;assets=Promise.resolve().then(function(){return window.FlexSearch?null:script('assets/vendor/flexsearch/flexsearch.bundle.min.js');}).then(function(){return window.__LAKE_ASSISTANT_KB__?null:script('assets/assistant-kb.js');}).then(function(){var kb=window.__LAKE_ASSISTANT_KB__,pack=kb&&kb.langs&&(kb.langs[lang()]||kb.langs.en),docs=pack&&pack.docs||[];index={docs:docs,flex:window.FlexSearch&&new window.FlexSearch.Index({tokenize:'forward',charset:'latin:simple'})};if(index.flex)docs.forEach(function(d,i){index.flex.add(i,[d.title||d.t,d.entity,(d.aliases||[]).join(' '),d.keywords||d.k,d.text||d.s].join(' '));});return index;});return assets;}
  function score(d,q,i,e){var title=norm(d.title||d.t),text=norm(d.text||d.s),s=(d.f||d.verification==='VERIFIED')?8:0,ename=norm(e&&e[0]);if(ename&&(norm(d.entity).indexOf(ename)>-1||norm(d.page||d.u)===norm(e[1])))s+=40;if(norm(d.page||d.u)===norm(state.currentPage))s+=8;words(q).forEach(function(w){s+=title.indexOf(w)>-1?8:text.indexOf(w)>-1?2:0;});return s;}
  function retrieve(q,i,e){if(!index)return null;var list=index.docs;if(index.flex&&words(q).length){var ids=index.flex.search(words(q).join(' '),{limit:18,suggest:true})||[];list=ids.map(function(x){return index.docs[x];}).filter(Boolean);}var best=list.map(function(d){return{d:d,s:score(d,q,i,e)};}).sort(function(a,b){return b.s-a.s;})[0];return best&&best.s>=(e?20:8)?best.d:null;}
  function quick(e){return e?[['About '+e[0],'tell me about '+e[0]],['Products & services','what services does '+e[0]+' provide'],['Contact','how do I contact '+e[0]],['Other companies','what companies are under lake group']]:[['Our Companies','what companies are under lake group'],['Careers','how can I apply for a job'],['Contact us','how do I contact lake group'],['Where we operate','where does lake group operate'],['Sustainability','what are your sustainability initiatives']];}
  function reply(q){var ex=entity(q),e=ex||(/\b(they|them|their|it|more|there)\b/i.test(q)?state.currentEntity:null),i=intent(q,e);if(i==='GREETING')return{text:'Hello. I can help with Lake Group companies, services, careers, locations and contact details.',actions:quick(e)};if(i==='THANKS')return{text:'You’re welcome. What would you like to know next?',actions:quick(e)};if(i==='HELP')return{text:'Ask about a Lake Group company, its products or services, locations, careers, sustainability, or how to contact us.',actions:quick(e)};var d=retrieve(q,i,e),route=e&&['COMPANY_INFO','PRODUCT_INFO','SERVICE_INFO','LOCATION','FOLLOW_UP'].indexOf(i)>-1?[e[1],e[0]]:routes[i];if(!d&&route)return{text:'The verified information is available on the relevant Lake Group page.',links:[{u:route[0],t:route[1]}]};if(!d)return{text:"I couldn't find a verified Lake Group answer for that.",nomatch:true,actions:quick(null)};return{text:d.text||d.s,links:[{u:d.page||d.u||'services.html',t:d.title||d.t||'View source'}],id:d.id};}
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
  window.LakeAssistantV2={classify:intent,entityFor:entity,answer:function(q){return knowledge().then(function(){return reply(q);});}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  document.addEventListener('pointerdown',function(e){if(refs.panel&&!refs.panel.hidden&&!refs.panel.contains(e.target)&&!refs.launcher.contains(e.target)){refs.panel.hidden=true;refs.launcher.setAttribute('aria-expanded','false');refs.mount.classList.remove('la-open');}});
})();
