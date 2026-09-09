import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type Place = { id: string; name: string; lat: number; lng: number; flag: string; desktop: [number, number]; mobile: [number, number]; altitude: number };

const PLACES: Place[] = [
  { id:'tz', name:'TANZANIA', lat:-6.7924, lng:39.2083, flag:'tz', desktop:[58,16], mobile:[30,12], altitude:0 },
  { id:'ke', name:'KENYA', lat:-1.2921, lng:36.8219, flag:'ke', desktop:[62,-44], mobile:[34,-34], altitude:.055 },
  { id:'ug', name:'UGANDA', lat:.3476, lng:32.5825, flag:'ug', desktop:[-116,-50], mobile:[-70,-38], altitude:.07 },
  { id:'rw', name:'RWANDA', lat:-1.9441, lng:30.0619, flag:'rw', desktop:[-138,-4], mobile:[-62,-4], altitude:.075 },
  { id:'bi', name:'BURUNDI', lat:-3.3614, lng:29.3599, flag:'bi', desktop:[-144,40], mobile:[-58,30], altitude:.08 },
  { id:'cd', name:'DR CONGO', lat:-4.4419, lng:15.2663, flag:'cd', desktop:[-124,86], mobile:[-6,58], altitude:.115 },
  { id:'zm', name:'ZAMBIA', lat:-15.3875, lng:28.3228, flag:'zm', desktop:[-114,88], mobile:[-55,64], altitude:.105 },
  { id:'mz', name:'MOZAMBIQUE', lat:-25.9692, lng:32.5732, flag:'mz', desktop:[52,72], mobile:[24,52], altitude:.135 },
  { id:'et', name:'ETHIOPIA', lat:9.03, lng:38.74, flag:'et', desktop:[64,-44], mobile:[32,-36], altitude:.13 },
  { id:'ae', name:'UAE', lat:24.4539, lng:54.3773, flag:'ae', desktop:[68,-20], mobile:[30,-18], altitude:.2 },
];
const RADIUS=2, FINAL_ROTATION=Math.PI+.58;

function geoVector(lat:number,lng:number,radius=RADIUS){const phi=THREE.MathUtils.degToRad(90-lat),theta=THREE.MathUtils.degToRad(lng+180);return new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta))}
function routePoints(destination:Place){const start=geoVector(PLACES[0].lat,PLACES[0].lng,1).normalize(),end=geoVector(destination.lat,destination.lng,1).normalize(),angle=start.angleTo(end),samples=96;return Array.from({length:samples},(_,index)=>{const t=index/(samples-1),sinAngle=Math.sin(angle),direction=sinAngle<.0001?start.clone():start.clone().multiplyScalar(Math.sin((1-t)*angle)/sinAngle).add(end.clone().multiplyScalar(Math.sin(t*angle)/sinAngle)),lift=Math.sin(Math.PI*t)*destination.altitude;return direction.normalize().multiplyScalar(RADIUS*(1.008+lift))})}

function Atmosphere(){const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#7cc7e6')}},vertexShader:`varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=(modelViewMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 color;varying vec3 n;varying vec3 p;void main(){float f=pow(1.-abs(dot(n,normalize(-p))),3.6);gl_FragColor=vec4(color,f*.19);}`}),[]);useEffect(()=>()=>material.dispose(),[material]);return <mesh scale={1.045}><sphereGeometry args={[RADIUS,96,64]}/><primitive object={material} attach="material"/></mesh>}

type DomRefs = React.MutableRefObject<Record<string, HTMLElement | SVGLineElement | null>>;

function RuntimePause(){const setFrameloop=useThree(state=>state.setFrameloop);useEffect(()=>{const sync=()=>setFrameloop(document.hidden?'never':'always');document.addEventListener('visibilitychange',sync);sync();return()=>document.removeEventListener('visibilitychange',sync)},[setFrameloop]);return null}

function Scene({reduced,labelRefs,leaderRefs}:{reduced:boolean;labelRefs:DomRefs;leaderRefs:DomRefs}){
  const {camera,size}=useThree(),group=useRef<THREE.Group>(null),earthMaterial=useRef<THREE.MeshStandardMaterial>(null),started=useRef(performance.now()),markerRefs=useRef<(THREE.Mesh|null)[]>([]),routeRefs=useRef<(THREE.Line|null)[]>([]);
  const day=useTexture('assets/images/globe/earth_day.webp'),bump=useTexture('assets/images/globe/earth_topology.webp'),routes=useMemo(()=>PLACES.slice(1).map(routePoints),[]),routeObjects=useMemo(()=>routes.map(points=>{const geometry=new THREE.BufferGeometry().setFromPoints(points);geometry.setDrawRange(0,reduced?96:0);return new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#fff200',transparent:true,opacity:.82}))}),[reduced,routes]);
  useEffect(()=>{day.colorSpace=THREE.SRGBColorSpace;day.anisotropy=8;bump.anisotropy=4;started.current=performance.now()+600;camera.position.set(0,.05,reduced?6.3:4.8);camera.lookAt(0,-.08,0)},[bump,camera,day,reduced]);
  useEffect(()=>()=>routeObjects.forEach(line=>{line.geometry.dispose();line.material.dispose()}),[routeObjects]);
  useFrame(()=>{
    if(!group.current)return;const elapsed=reduced?14:Math.max(0,(performance.now()-started.current)/1000),pull=THREE.MathUtils.smoothstep(elapsed,2,4.5),align=THREE.MathUtils.smoothstep(elapsed,4.5,6.5);
    if(earthMaterial.current)earthMaterial.current.opacity=reduced?1:.12+.88*THREE.MathUtils.smoothstep(elapsed,0,2);
    camera.position.z=THREE.MathUtils.lerp(size.width<600?7.2:4.8,size.width<600?9.3:6.3,pull);group.current.rotation.y=THREE.MathUtils.lerp(FINAL_ROTATION-.32,FINAL_ROTATION,align);group.current.rotation.x=-.065;
    const originOn=elapsed>=6.35?1:0;markerRefs.current.forEach((mesh,index)=>{if(!mesh)return;const active=index===0?originOn:THREE.MathUtils.smoothstep(elapsed,6.72+(index-1)*.36,7.02+(index-1)*.36);mesh.scale.setScalar(active*(index===0?1.18:1))});
    routeRefs.current.forEach((line,index)=>{if(!line)return;const progress=THREE.MathUtils.smoothstep(elapsed,6.5+index*.36,7.18+index*.36);line.geometry.setDrawRange(0,Math.max(0,Math.floor(progress*96)))});
    PLACES.forEach((place,index)=>{const label=labelRefs.current[place.id] as HTMLElement|null,leader=leaderRefs.current[place.id] as SVGLineElement|null;if(!label||!leader)return;const world=geoVector(place.lat,place.lng,RADIUS*1.018).applyEuler(group.current!.rotation),visible=world.clone().normalize().dot(camera.position.clone().normalize())>.08,reveal=index===0?originOn:THREE.MathUtils.smoothstep(elapsed,6.78+(index-1)*.36,7.08+(index-1)*.36),projected=world.clone().project(camera),x=(projected.x*.5+.5)*size.width,y=(-projected.y*.5+.5)*size.height,offset=size.width<600?place.mobile:place.desktop,lx=x+offset[0],ly=y+offset[1];label.style.transform=`translate3d(${lx}px,${ly}px,0)`;label.style.opacity=visible?String(reveal):'0';leader.setAttribute('x1',String(x));leader.setAttribute('y1',String(y));leader.setAttribute('x2',String(lx));leader.setAttribute('y2',String(ly));leader.style.opacity=visible?String(reveal*.58):'0'})
  });
  return <><RuntimePause/><ambientLight intensity={.34} color="#b9d6e6"/><directionalLight position={[4.8,2.4,5.6]} intensity={2.05} color="#fff7df"/><directionalLight position={[-4,-.5,2]} intensity={.34} color="#3c78a3"/><group ref={group} rotation={[-.065,FINAL_ROTATION-.32,0]}><mesh><sphereGeometry args={[RADIUS,128,96]}/><meshStandardMaterial ref={earthMaterial} map={day} bumpMap={bump} bumpScale={.035} roughness={.92} metalness={0} transparent opacity={reduced?1:.12}/></mesh>{routeObjects.map((line,index)=><primitive key={PLACES[index+1].id} object={line} ref={(value:THREE.Line|null)=>{routeRefs.current[index]=value}}/>)}{PLACES.map((place,index)=><mesh key={place.id} position={geoVector(place.lat,place.lng,RADIUS*1.012)} ref={(value)=>{markerRefs.current[index]=value}} scale={reduced?(index===0?1.18:1):0}><sphereGeometry args={[index===0?.036:.025,18,18]}/><meshBasicMaterial color="#fff200" toneMapped={false}/></mesh>)}</group><Atmosphere/></>
}

function GlobeMaster(){const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||new URLSearchParams(location.search).has('final'),labelRefs=useRef<Record<string,HTMLElement|null>>({}),leaderRefs=useRef<Record<string,SVGLineElement|null>>({});return <main className="experience" aria-label="Lake Group global network centered on Tanzania"><div className="planet-halo" aria-hidden="true"/><Canvas dpr={[1,1.65]} camera={{fov:43,near:.1,far:100}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}}><Suspense fallback={null}><Scene reduced={reduced} labelRefs={labelRefs as DomRefs} leaderRefs={leaderRefs as DomRefs}/></Suspense></Canvas><svg className="leaders" aria-hidden="true">{PLACES.map(place=><line key={place.id} data-leader={place.id} ref={node=>{leaderRefs.current[place.id]=node}}/>)}</svg><div className="labels" aria-hidden="true">{PLACES.map(place=><div className={`map-label ${place.id==='tz'?'origin':''}`} data-label={place.id} key={place.id} ref={node=>{labelRefs.current[place.id]=node}}><img src={`assets/images/flags/${place.flag}.svg`} alt=""/><span>{place.name}</span></div>)}</div><div className="sr-only">Lake Group locations: {PLACES.map(place=>place.name).join(', ')}. Every route begins in Dar es Salaam, Tanzania.</div></main>}
createRoot(document.getElementById('root')!).render(<GlobeMaster/>);
