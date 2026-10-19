import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type Locale = 'sw'|'hi'|'ar'|'zh'|'fr'|'es'|'pt';
type Place = { id: string; name: string; lat: number; lng: number; flag: string; desktop: [number, number]; mobile: [number, number]; altitude: number };

const PLACES: Place[] = [
  { id:'tz', name:'TANZANIA', lat:-6.7924, lng:39.2083, flag:'tz', desktop:[68,18], mobile:[38,24], altitude:0 },
  { id:'ke', name:'KENYA', lat:-1.2921, lng:36.8219, flag:'ke', desktop:[72,-38], mobile:[42,-34], altitude:.055 },
  { id:'ug', name:'UGANDA', lat:.3476, lng:32.5825, flag:'ug', desktop:[-112,-52], mobile:[-82,-48], altitude:.07 },
  { id:'rw', name:'RWANDA', lat:-1.9441, lng:30.0619, flag:'rw', desktop:[-104,-8], mobile:[-78,-6], altitude:.075 },
  { id:'bi', name:'BURUNDI', lat:-3.3614, lng:29.3599, flag:'bi', desktop:[-108,26], mobile:[-80,28], altitude:.08 },
  { id:'cd', name:'DR CONGO', lat:-4.4419, lng:15.2663, flag:'cd', desktop:[-142,4], mobile:[-104,2], altitude:.115 },
  { id:'zm', name:'ZAMBIA', lat:-15.3875, lng:28.3228, flag:'zm', desktop:[-124,52], mobile:[-92,50], altitude:.105 },
  { id:'mz', name:'MOZAMBIQUE', lat:-25.9692, lng:32.5732, flag:'mz', desktop:[58,54], mobile:[34,50], altitude:.135 },
  { id:'et', name:'ETHIOPIA', lat:9.03, lng:38.74, flag:'et', desktop:[72,-44], mobile:[42,-42], altitude:.13 },
  { id:'ae', name:'UAE', lat:24.4539, lng:54.3773, flag:'ae', desktop:[88,-72], mobile:[50,-68], altitude:.2 },
];
const RADIUS=2, FINAL_ROTATION=4.36, HOLD_AT_SECONDS=12, CYCLE_SECONDS=18, RETRACT_START_SECONDS=15, RETRACT_END_SECONDS=17;
const APPROVED_START_ROTATIONS=[FINAL_ROTATION-1.82,FINAL_ROTATION+1.66,FINAL_ROTATION-2.48,FINAL_ROTATION+2.32];
function chooseStartRotation(){const requested=Number(new URLSearchParams(location.search).get('globeStart')),random=globalThis.crypto?.getRandomValues?globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/0xffffffff:Math.random(),index=Number.isInteger(requested)&&requested>=0?requested%APPROVED_START_ROTATIONS.length:Math.floor(random*APPROVED_START_ROTATIONS.length);return APPROVED_START_ROTATIONS[index]}
const PLACE_NAMES:Record<string,Record<Locale,string>>={
  tz:{sw:'TANZANIA',hi:'तंज़ानिया',ar:'تنزانيا',zh:'坦桑尼亚',fr:'TANZANIE',es:'TANZANIA',pt:'TANZÂNIA'},ke:{sw:'KENYA',hi:'केन्या',ar:'كينيا',zh:'肯尼亚',fr:'KENYA',es:'KENIA',pt:'QUÉNIA'},
  ug:{sw:'UGANDA',hi:'युगांडा',ar:'أوغندا',zh:'乌干达',fr:'OUGANDA',es:'UGANDA',pt:'UGANDA'},rw:{sw:'RWANDA',hi:'रवांडा',ar:'رواندا',zh:'卢旺达',fr:'RWANDA',es:'RUANDA',pt:'RUANDA'},
  bi:{sw:'BURUNDI',hi:'बुरुंडी',ar:'بوروندي',zh:'布隆迪',fr:'BURUNDI',es:'BURUNDI',pt:'BURUNDI'},cd:{sw:'JAMHURI YA KIDEMOKRASIA YA KONGO',hi:'कांगो लोकतांत्रिक गणराज्य',ar:'جمهورية الكونغو الديمقراطية',zh:'刚果民主共和国',fr:'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',es:'REPÚBLICA DEMOCRÁTICA DEL CONGO',pt:'REPÚBLICA DEMOCRÁTICA DO CONGO'},
  zm:{sw:'ZAMBIA',hi:'ज़ाम्बिया',ar:'زامبيا',zh:'赞比亚',fr:'ZAMBIE',es:'ZAMBIA',pt:'ZÂMBIA'},mz:{sw:'MSUMBIJI',hi:'मोज़ाम्बिक',ar:'موزمبيق',zh:'莫桑比克',fr:'MOZAMBIQUE',es:'MOZAMBIQUE',pt:'MOÇAMBIQUE'},
  et:{sw:'ETHIOPIA',hi:'इथियोपिया',ar:'إثيوبيا',zh:'埃塞俄比亚',fr:'ÉTHIOPIE',es:'ETIOPÍA',pt:'ETIÓPIA'},ae:{sw:'UAE',hi:'संयुक्त अरब अमीरात',ar:'الإمارات العربية المتحدة',zh:'阿联酋',fr:'ÉMIRATS ARABES UNIS',es:'EMIRATOS ÁRABES UNIDOS',pt:'EMIRADOS ÁRABES UNIDOS'},
};
const GLOBE_ACCESSIBILITY:Record<Locale,{label:string;prefix:string;suffix:string}>={
  sw:{label:'Mtandao wa kimataifa wa Lake Group unaozingatia Tanzania',prefix:'Maeneo ya Lake Group: ',suffix:'. Kila njia huanzia Dar es Salaam, Tanzania.'},
  hi:{label:'तंज़ानिया पर केंद्रित Lake Group का वैश्विक नेटवर्क',prefix:'Lake Group के स्थान: ',suffix:'. हर मार्ग दार एस सलाम, तंज़ानिया से शुरू होता है।'},
  ar:{label:'شبكة Lake Group العالمية المتمركزة في تنزانيا',prefix:'مواقع Lake Group: ',suffix:'. يبدأ كل مسار في دار السلام، تنزانيا.'},
  zh:{label:'以坦桑尼亚为中心的 Lake Group 全球网络',prefix:'Lake Group 所在地：',suffix:'。每条路线均从坦桑尼亚达累斯萨拉姆出发。'},
  fr:{label:'Réseau mondial de Lake Group centré sur la Tanzanie',prefix:'Implantations de Lake Group : ',suffix:'. Chaque itinéraire commence à Dar es Salaam, en Tanzanie.'},
  es:{label:'Red global de Lake Group centrada en Tanzania',prefix:'Ubicaciones de Lake Group: ',suffix:'. Todas las rutas comienzan en Dar es Salaam, Tanzania.'},
  pt:{label:'Rede global da Lake Group centrada na Tanzânia',prefix:'Unidades da Lake Group: ',suffix:'. Todas as rotas começam em Dar es Salaam, Tanzânia.'},
};
function localeCode():Locale|null{const value=String((window as any).LakeI18n?.current||document.documentElement.lang||'en').toLowerCase().split('-')[0];return ['sw','hi','ar','zh','fr','es','pt'].includes(value)?value as Locale:null}
const START_ROTATION=chooseStartRotation();

function geoVector(lat:number,lng:number,radius=RADIUS){const phi=THREE.MathUtils.degToRad(90-lat),theta=THREE.MathUtils.degToRad(lng+180);return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta))}
function routePoints(destination:Place){const start=geoVector(PLACES[0].lat,PLACES[0].lng,1).normalize(),end=geoVector(destination.lat,destination.lng,1).normalize(),angle=start.angleTo(end),samples=96;return Array.from({length:samples},(_,index)=>{const t=index/(samples-1),sinAngle=Math.sin(angle),direction=sinAngle<.0001?start.clone():start.clone().multiplyScalar(Math.sin((1-t)*angle)/sinAngle).add(end.clone().multiplyScalar(Math.sin(t*angle)/sinAngle)),lift=Math.sin(Math.PI*t)*destination.altitude;return direction.normalize().multiplyScalar(RADIUS*(1.008+lift))})}

function Atmosphere(){const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#7cc7e6')}},vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=(modelViewMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 color;varying vec3 n;varying vec3 p;void main(){float f=pow(1.-abs(dot(n,normalize(-p))),3.6);gl_FragColor=vec4(color,f*.19);}`}),[]);useEffect(()=>()=>material.dispose(),[material]);return <mesh scale={1.045}><sphereGeometry args={[RADIUS,96,64]}/><primitive object={material} attach="material"/></mesh>}

type DomRefs = React.MutableRefObject<Record<string, HTMLElement | SVGPathElement | null>>;
type Dock = { angle:number; ring:'inner'|'outer'; side?:'left'|'right' };
type Docks = Record<string,Dock>;
// Clockwise degrees from the right-hand horizon. These are authored slots,
// not a runtime sorting or collision system. The two halo bands are invisible.
const DESKTOP_DOCKS:Docks={ae:{angle:-52,ring:'outer'},et:{angle:-32,ring:'inner'},ug:{angle:-14,ring:'outer'},ke:{angle:2,ring:'inner'},rw:{angle:-166,ring:'inner',side:'left'},tz:{angle:34,ring:'inner'},bi:{angle:177,ring:'inner',side:'left'},mz:{angle:65,ring:'inner'},zm:{angle:110,ring:'outer',side:'left'},cd:{angle:151,ring:'inner'}};
const TABLET_PORTRAIT_DOCKS:Docks={ae:{angle:-52,ring:'outer'},et:{angle:-33,ring:'inner'},ug:{angle:-15,ring:'outer'},ke:{angle:2,ring:'inner'},rw:{angle:-162,ring:'inner',side:'left'},tz:{angle:35,ring:'inner'},bi:{angle:174,ring:'inner',side:'left'},mz:{angle:68,ring:'inner'},zm:{angle:110,ring:'outer',side:'left'},cd:{angle:151,ring:'inner'}};
const MOBILE_DOCKS:Docks={ae:{angle:-57,ring:'outer'},et:{angle:-29,ring:'inner'},ug:{angle:-17,ring:'outer'},ke:{angle:-7,ring:'inner'},rw:{angle:-160,ring:'inner',side:'left'},tz:{angle:37,ring:'inner'},bi:{angle:174,ring:'inner',side:'left'},mz:{angle:73,ring:'inner'},zm:{angle:110,ring:'outer',side:'left'},cd:{angle:145,ring:'inner'}};
const WIDE_MOBILE_DOCKS:Docks={...MOBILE_DOCKS,tz:{angle:28,ring:'inner'}};
function dockLayout(width:number){return width<420?MOBILE_DOCKS:width<600?WIDE_MOBILE_DOCKS:width<960?TABLET_PORTRAIT_DOCKS:DESKTOP_DOCKS}

function RuntimePause(){const setFrameloop=useThree(state=>state.setFrameloop),gl=useThree(state=>state.gl);useEffect(()=>{let onscreen=true;const sync=()=>setFrameloop(document.hidden||!onscreen?'never':'always'),target=gl.domElement.closest('.experience');const observer=target&&'IntersectionObserver'in window?new IntersectionObserver(entries=>{onscreen=entries[0]?.isIntersecting??true;sync()},{rootMargin:'120px'}):null;observer?.observe(target!);document.addEventListener('visibilitychange',sync);sync();return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',sync)}},[gl,setFrameloop]);return null}

function Scene({reduced,labelRefs,leaderRefs}:{reduced:boolean;labelRefs:DomRefs;leaderRefs:DomRefs}){
  const {camera,size,gl}=useThree(),group=useRef<THREE.Group>(null),timeline=useRef(reduced?12:0),cycleCount=useRef(0),markerRefs=useRef<(THREE.Mesh|null)[]>([]),routeRefs=useRef<(THREE.Line|null)[]>([]),drag=useRef({active:false,id:-1,x:0,y:0}),userOffset=useRef({active:false,x:0,y:0,lastInput:0,decay:0}),automatedRotation=useRef({x:-.04,y:FINAL_ROTATION});
  const day=useTexture('assets/images/globe/earth_day.webp'),bump=useTexture('assets/images/globe/earth_topology.webp'),routes=useMemo(()=>PLACES.slice(1).map(routePoints),[]),routeObjects=useMemo(()=>routes.map(points=>{const geometry=new THREE.BufferGeometry().setFromPoints(points);geometry.setDrawRange(0,reduced?96:0);return new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#fff200',transparent:true,opacity:.68}))}),[reduced,routes]);
  useEffect(()=>{day.colorSpace=THREE.SRGBColorSpace;day.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());bump.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy());gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.18;camera.position.set(0,.05,size.width<600?7.8:6.3);camera.lookAt(0,-.08,0)},[bump,camera,day,gl,size.width]);
  useEffect(()=>{const canvas=gl.domElement;canvas.style.touchAction='pan-y';const down=(event:PointerEvent)=>{if(event.button!==0||!group.current)return;userOffset.current={active:true,x:group.current.rotation.x-automatedRotation.current.x,y:group.current.rotation.y-automatedRotation.current.y,lastInput:performance.now(),decay:0};drag.current={active:true,id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);canvas.classList.add('is-dragging')},move=(event:PointerEvent)=>{const current=drag.current;if(!current.active||current.id!==event.pointerId)return;const dx=event.clientX-current.x,dy=event.clientY-current.y;current.x=event.clientX;current.y=event.clientY;userOffset.current.y+=dx*.007;userOffset.current.x=THREE.MathUtils.clamp(userOffset.current.x+dy*.003,-.34,.24);userOffset.current.lastInput=performance.now()},up=(event:PointerEvent)=>{if(drag.current.id!==event.pointerId)return;drag.current.active=false;userOffset.current.active=false;userOffset.current.decay=1;canvas.releasePointerCapture?.(event.pointerId);canvas.classList.remove('is-dragging')};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up)}},[gl]);
  useEffect(()=>()=>routeObjects.forEach(line=>{line.geometry.dispose();line.material.dispose()}),[routeObjects]);
  useFrame((_,delta)=>{
    if(!group.current)return;
    // Reveal the network, hold it for three seconds, then retract it over two
    // seconds. A full turn returns to the same orientation at the cycle seam.
    const previousTime=timeline.current;
    timeline.current=reduced?HOLD_AT_SECONDS:(timeline.current+Math.min(delta,.2))%CYCLE_SECONDS;
    if(!reduced&&timeline.current<previousTime)cycleCount.current+=1;
    const elapsed=Math.max(0,timeline.current),travel=THREE.MathUtils.smoothstep(elapsed,2,8);
    const retraction=reduced?0:THREE.MathUtils.smoothstep(elapsed,RETRACT_START_SECONDS,RETRACT_END_SECONDS);
    const phase=reduced?'hold':elapsed<2?'clean':elapsed<6?'rotate':elapsed<8?'africa-centered':elapsed<10?'reveal':elapsed<RETRACT_START_SECONDS?'hold':elapsed<RETRACT_END_SECONDS?'retract':'clean';
    const panel=gl.domElement.closest('.experience-3d-panel') as HTMLElement|null;if(panel){if(panel.dataset.globePhase!==phase)panel.dataset.globePhase=phase;panel.dataset.globeCycle=String(cycleCount.current)}
    camera.position.set(0,.05,size.width<600?7.8:6.3);camera.lookAt(0,-.08,0);
    automatedRotation.current={x:0,y:FINAL_ROTATION+travel*(Math.PI*2)};
    const offset=userOffset.current;
    if(offset.active){group.current.rotation.y=automatedRotation.current.y+offset.y;group.current.rotation.x=THREE.MathUtils.clamp(automatedRotation.current.x+offset.x,-.34,.24)}
    else if(offset.decay>0){offset.decay=Math.max(0,offset.decay-.03*Math.min(delta,.2));group.current.rotation.y=automatedRotation.current.y+offset.y*offset.decay;group.current.rotation.x=THREE.MathUtils.clamp(automatedRotation.current.x+offset.x*offset.decay,-.34,.24)}
    else{offset.x=0;offset.y=0;group.current.rotation.y=automatedRotation.current.y;group.current.rotation.x=automatedRotation.current.x}
    const originOn=THREE.MathUtils.smoothstep(elapsed,7.9,8.25)*(1-retraction);markerRefs.current.forEach((mesh,index)=>{if(!mesh)return;const start=8.2+(index-1)*.41,active=index===0?originOn:THREE.MathUtils.smoothstep(elapsed,start,start+.28)*(1-retraction);mesh.scale.setScalar(active*(index===0?1.18:1))});
    routeRefs.current.forEach((line,index)=>{if(!line)return;const start=8.15+index*.41,progress=THREE.MathUtils.smoothstep(elapsed,start,start+.38)*(1-retraction);line.geometry.setDrawRange(0,Math.max(0,Math.floor(progress*96)))});
    const center=new THREE.Vector3(0,0,0).project(camera),rim=new THREE.Vector3(RADIUS,0,0).project(camera),centerX=(center.x*.5+.5)*size.width,centerY=(-center.y*.5+.5)*size.height,radiusX=Math.max(1,Math.abs((rim.x-center.x)*.5*size.width)),radiusY=radiusX;
    const docks=dockLayout(window.innerWidth);
    PLACES.forEach((place,index)=>{
      const label=labelRefs.current[place.id] as HTMLElement|null;
      const leader=leaderRefs.current[place.id] as SVGPathElement|null;
      if(!label||!leader)return;
      const dockNode=leader.nextElementSibling as SVGCircleElement;
      const world=geoVector(place.lat,place.lng,RADIUS*1.018).applyEuler(group.current!.rotation);
      const projected=world.clone().project(camera),x=(projected.x*.5+.5)*size.width,y=(-projected.y*.5+.5)*size.height;
      const slot=docks[place.id],angle=THREE.MathUtils.degToRad(slot.angle),band=place.id==='ae'?1.4:slot.ring==='inner'?1.10:1.16;
      const dx=centerX+Math.cos(angle)*radiusX*band,dy=centerY+Math.sin(angle)*radiusY*band;
      const width=label.offsetWidth,height=label.offsetHeight;
      const side=slot.side??(Math.cos(angle)>=0?'right':'left');
      const left=THREE.MathUtils.clamp(dx+(side==='right'?12:-width-12),12,size.width-width-12);
      const top=THREE.MathUtils.clamp(dy-height/2,12,size.height-height-12);
      // Dock against the measured content box AFTER safe-bound clamping.
      // This leaves 12px of clear space before the flag/name on either side.
      const endX=side==='right'?left-12:left+width+12,endY=top+height/2;
      const vx=endX-x,vy=endY-y,cx=x+vx*.54-vy*.025,cy=y+vy*.54+vx*.025;
      let path=`M ${x} ${y} Q ${cx} ${cy} ${endX} ${endY}`;
      if(place.id==='rw'){
        const exitX=centerX+radiusX*.08,exitY=centerY-radiusY*.16;
        path=`M ${x} ${y} Q ${x-radiusX*.04} ${exitY} ${exitX} ${exitY} Q ${endX+24} ${endY} ${endX} ${endY}`;
      } else if(place.id==='bi'){
        const exitX=centerX+radiusX*.02,exitY=centerY+radiusY*.04;
        path=`M ${x} ${y} Q ${x-radiusX*.05} ${exitY} ${exitX} ${exitY} Q ${endX+24} ${endY} ${endX} ${endY}`;
      }
      label.dataset.side=side;
      leader.setAttribute('d',path);
      leader.setAttribute('pathLength','1');
      const markerStart=index===0?7.9:8.2+(index-1)*.41;
      const start=markerStart+.10,draw=(reduced?1:THREE.MathUtils.smoothstep(elapsed,start,start+.40))*(1-retraction);
      const labelReveal=(reduced?1:THREE.MathUtils.smoothstep(elapsed,start+.32,start+.55))*(1-retraction);
      // Keep geographical occlusion, but do not blank the overlay while the
      // user drags or while the post-drag offset settles back to the hold.
      const attached=world.clone().normalize().dot(camera.position.clone().normalize())>.08;
      label.style.transform=`translate3d(${left}px,${top+(1-labelReveal)*5}px,0)`;
      label.style.opacity=String(attached?labelReveal:0);
      leader.style.strokeDasharray='1';
      leader.style.strokeDashoffset=String(1-draw);
      leader.style.opacity=String(attached?(window.innerWidth<600?.72:.65):0);
      leader.dataset.centerX=String(centerX);leader.dataset.centerY=String(centerY);leader.dataset.globeRadius=String(radiusX);
      leader.dataset.progress=String(draw);
      dockNode.setAttribute('cx',String(endX));dockNode.setAttribute('cy',String(endY));
      dockNode.style.opacity=String(attached?labelReveal:0);
    });
  });
  return <><RuntimePause/><ambientLight intensity={.78} color="#cbe5f2"/><hemisphereLight args={['#b7dff1','#06111d',.42]}/><directionalLight position={[4.8,2.4,5.6]} intensity={2.3} color="#fff7df"/><directionalLight position={[-4.6,-.4,1.6]} intensity={.74} color="#5c9bc4"/><group ref={group} rotation={[0,FINAL_ROTATION,0]}><mesh><sphereGeometry args={[RADIUS,128,96]}/><meshStandardMaterial map={day} bumpMap={bump} bumpScale={.035} color="#c4d2d8" emissive="#0a2234" emissiveIntensity={.42} roughness={.88} metalness={0}/></mesh>{routeObjects.map((line,index)=><primitive key={PLACES[index+1].id} object={line} ref={(value:THREE.Line|null)=>{routeRefs.current[index]=value}}/>)}{PLACES.map((place,index)=><mesh key={place.id} position={geoVector(place.lat,place.lng,RADIUS*1.012)} ref={(value)=>{markerRefs.current[index]=value}} scale={reduced?(index===0?1.12:1):0}><sphereGeometry args={[index===0?.022:.016,16,16]}/><meshBasicMaterial color="#fff200" toneMapped={false}/></mesh>)}</group><Atmosphere/></>
}

function GlobeMaster(){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).has('final'),labelRefs=useRef<Record<string,HTMLElement|null>>({}),leaderRefs=useRef<Record<string,SVGPathElement|null>>({});
  useEffect(()=>{const applyNames=()=>{const locale=localeCode();PLACES.forEach(place=>{const label=labelRefs.current[place.id];if(!label)return;const text=label.querySelector('span');if(text)text.textContent=locale?PLACE_NAMES[place.id][locale]:place.name;label.dir=locale==='ar'?'rtl':'ltr'});const main=labelRefs.current.tz?.closest('main'),hidden=main?.querySelector('.sr-only');if(main)main.setAttribute('aria-label',locale?GLOBE_ACCESSIBILITY[locale].label:'Lake Group global network centered on Tanzania');if(hidden){const names=PLACES.map(place=>locale?PLACE_NAMES[place.id][locale]:place.name).join(', ');hidden.textContent=locale?GLOBE_ACCESSIBILITY[locale].prefix+names+GLOBE_ACCESSIBILITY[locale].suffix:'Lake Group locations: '+names+'. Every route begins in Dar es Salaam, Tanzania.'}};applyNames();document.addEventListener('lake-i18n-applied',applyNames);return()=>document.removeEventListener('lake-i18n-applied',applyNames)},[]);
  return <main className="experience" aria-label="Lake Group global network centered on Tanzania"><Canvas dpr={[1,1.5]} camera={{fov:43,near:.1,far:100}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setClearColor(0x000000,0)}}><Suspense fallback={null}><Scene reduced={reduced} labelRefs={labelRefs as DomRefs} leaderRefs={leaderRefs as DomRefs}/></Suspense></Canvas><svg className="leaders" aria-hidden="true">{PLACES.map(place=><g key={place.id}><path data-leader={place.id} ref={node=>{leaderRefs.current[place.id]=node}}/><circle data-dock={place.id} r="1.5" fill={place.id==='tz'?'#fff200':'#eaf3f7'}/></g>)}</svg><div className="labels" aria-hidden="true">{PLACES.map(place=><div className={`map-label ${place.id==='tz'?'origin':''}`} data-label={place.id} key={place.id} ref={node=>{labelRefs.current[place.id]=node}}><img src={`assets/images/flags/${place.flag}.svg`} alt=""/><span>{place.name}</span></div>)}</div><div className="sr-only">Lake Group locations: {PLACES.map(place=>place.name).join(', ')}. Every route begins in Dar es Salaam, Tanzania.</div></main>
}
const mountNode=document.getElementById('root')??document.getElementById('hero-globe-root');
if(mountNode){const reactRoot=createRoot(mountNode);reactRoot.render(<GlobeMaster/>);window.addEventListener('pagehide',()=>reactRoot.unmount(),{once:true})}
