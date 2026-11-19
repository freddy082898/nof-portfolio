import * as THREE from 'https://esm.sh/three@0.170.0';
export async function showArtwork3D({title,width_cm,height_cm,front,views=[]}){
 const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Visualisation 3D de '+title);
 overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#151412;color:#fff;display:flex;flex-direction:column;font-family:system-ui';
 const top=document.createElement('div');top.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:17px 22px;z-index:2';
 const heading=document.createElement('strong');heading.textContent=title;
 const close=document.createElement('button');close.textContent='Fermer ×';close.style.cssText='border:1px solid #777;background:transparent;color:white;padding:10px 14px;cursor:pointer';top.append(heading,close);
 const viewport=document.createElement('div');viewport.style.cssText='position:relative;flex:1;min-height:0;touch-action:none;cursor:grab';
 const hint=document.createElement('div');hint.textContent='Glisser pour tourner · Pincer pour zoomer';hint.style.cssText='text-align:center;color:#c8c1b5;padding:16px;font-size:13px';
 overlay.append(top,viewport,hint);document.body.append(overlay);
 let renderer,geometry,materials=[],raf=0,disposed=false,resize=()=>{};
 const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('keydown',keyHandler);geometry?.dispose();materials.forEach(m=>{m.map?.dispose();m.dispose()});renderer?.dispose();renderer?.domElement.remove();overlay.remove()};
 const keyHandler=e=>{if(e.key==='Escape')cleanup()};window.addEventListener('keydown',keyHandler);close.onclick=cleanup;
 const observer=new ResizeObserver(()=>resize());
 try{
 const scene=new THREE.Scene();scene.background=new THREE.Color('#151412');
 const camera=new THREE.PerspectiveCamera(36,1,.1,100);
 const rendererOpts={antialias:true,alpha:false,powerPreference:'high-performance'};
 renderer=new THREE.WebGLRenderer(rendererOpts);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;viewport.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x77716a,2.2));
 const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(-3,5,6);scene.add(key);
 const fill=new THREE.DirectionalLight(0xd9e4ff,1.1);fill.position.set(5,1,-3);scene.add(fill);
 const w=Number(width_cm)>0?Number(width_cm):60,h=Number(height_cm)>0?Number(height_cm):80,ratio=Math.min(2.3,Math.max(.4,w/h)),height=2.5,width=height*ratio,depth=Math.min(.24,Math.max(.075,width*.075));
 geometry=new THREE.BoxGeometry(width,height,depth);
 const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
 async function texture(url){if(!url)return null;try{const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}catch(e){console.warn('Texture unavailable',e);return null}}
 // Photo order convention: 0 front, 1 front-right, 2 right, 3 back, 4 left, 5 front-left.
 const urls=[views[2]||null,views[4]||null,null,null,front||views[0]||null,views[3]||null];
 const maps=await Promise.all(urls.map(texture));
 if(disposed){maps.forEach(m=>m?.dispose());return}
 const colors=['#d9d2c6','#d9d2c6','#e9e1d5','#d0c7b9','#fff','#d6cabb'];
 materials=maps.map((map,i)=>new THREE.MeshStandardMaterial({map:map||null,color:map?'#ffffff':colors[i],roughness:.67,metalness:0,side:THREE.FrontSide}));
 const mesh=new THREE.Mesh(geometry,materials);scene.add(mesh);
 // thin neutral edge line enhances real canvas depth without inventing image content
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x827b70,transparent:true,opacity:.5}));mesh.add(edge);
 let yaw=-.28,pitch=.12,zoom=6.5,vy=0,vp=0,drag=false,px=0,py=0;const pointers=new Map();let pinch=0;
 viewport.addEventListener('pointerdown',e=>{viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag=true;px=e.clientX;py=e.clientY;viewport.style.cursor='grabbing'});
 viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const pts=[...pointers.values()];const dist=Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1]);if(pinch)zoom=Math.min(11,Math.max(3.7,zoom*pinch/dist));pinch=dist;return}pinch=0;vy=(e.clientX-old[0])*.008;vp=(e.clientY-old[1])*.006;yaw+=vy;pitch=Math.max(-1.3,Math.min(1.3,pitch+vp))});
 const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=0;if(!pointers.size){drag=false;viewport.style.cursor='grab'}};viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',release);
 viewport.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(11,Math.max(3.7,zoom+e.deltaY*.007))},{passive:false});
 resize=()=>{if(disposed||!renderer)return;const rect=viewport.getBoundingClientRect();if(rect.width<1||rect.height<1)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix()};
 observer.observe(viewport);resize();
 function animate(){if(disposed)return;raf=requestAnimationFrame(animate);if(!drag){yaw+=vy;pitch=Math.max(-1.3,Math.min(1.3,pitch+vp));vy*=.93;vp*=.93}mesh.rotation.y=yaw;mesh.rotation.x=pitch;camera.position.set(0,0,zoom);camera.lookAt(0,0,0);renderer.render(scene,camera)}animate();
 }catch(e){console.error(e);hint.textContent='La visualisation 3D est indisponible sur cet appareil.'}

}