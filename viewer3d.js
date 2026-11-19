import * as THREE from 'https://esm.sh/three@0.170.0';

// NOF studio viewer: faithful front image, calibrated geometry, no projected oblique photos.
export async function showArtwork3D({title,width_cm,height_cm,front,views=[]}){
 const modal=document.createElement('div');
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Vue 3D de '+title);
 modal.style.cssText='position:fixed;inset:0;z-index:10000;background:#e9e6e0;color:#282622;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif';
 const header=document.createElement('header');header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:16px 20px;gap:16px';
 const name=document.createElement('strong');name.textContent=title;
 const close=document.createElement('button');close.textContent='Fermer ×';close.style.cssText='background:transparent;border:1px solid #999;border-radius:30px;padding:10px 16px;color:inherit;font:inherit;cursor:pointer';
 header.append(name,close);
 const stage=document.createElement('div');stage.style.cssText='position:relative;flex:1;min-height:0;touch-action:none;cursor:grab;overflow:hidden';
 const footer=document.createElement('footer');footer.style.cssText='display:block;flex:none;background:#e9e6e0;padding:14px 20px 24px;text-align:center;font-size:13px;color:#555';
 footer.textContent='Tourner avec un doigt · Zoomer avec deux doigts · Épaisseur indicative';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:8px 12px;background:#e9e6e0';
 const action=(label)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:1px solid #aaa;border-radius:22px;background:#f8f6f2;color:#282622;padding:9px 14px;cursor:pointer;font:12px system-ui';actions.append(b);return b};
 const frontButton=action('Face'),sideButton=action('Profil'),backButton=action('Dos'),resetButton=action('Réinitialiser');
 modal.append(header,stage,actions,footer);document.body.append(modal);
 const loading=document.createElement('div');loading.setAttribute('role','status');loading.textContent='Chargement de la toile 3D…';loading.style.cssText='position:absolute;inset:0;display:grid;place-items:center;color:#555;font:14px system-ui;pointer-events:none';stage.append(loading);
 let renderer,scene,camera,mesh,geo,edgeGeo,edgeMat,frameGeo,frameMat,raf=0,disposed=false,observer,resize=()=>{},textures=[];
 const key=e=>{if(e.key==='Escape')destroy()};
 function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);geo?.dispose();edgeGeo?.dispose();edgeMat?.dispose();frameGeo?.dispose();frameMat?.dispose();mesh?.material?.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer?.dispose();modal.remove()}
 close.onclick=destroy;window.addEventListener('keydown',key);
 try{
  scene=new THREE.Scene();scene.background=new THREE.Color('#e9e6e0');
  camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,100);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;renderer.domElement.style.cssText='display:block;width:100%;height:100%;max-width:none;max-height:none';stage.append(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,.9));
  const soft=new THREE.DirectionalLight(0xffffff,1.1);soft.position.set(-3,5,7);scene.add(soft);
  const rim=new THREE.DirectionalLight(0xffffff,.35);rim.position.set(3,2,-5);scene.add(rim);
  const loader=new THREE.TextureLoader();
  async function load(url){if(!url)return null;try{const t=await loader.loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t}catch(e){console.warn('NOF photo unavailable',e);return null}}
  const frontTex=await load(front||views[0]);if(disposed)return;if(!frontTex){loading.textContent='Image indisponible. Réessayez en rouvrant la toile.';return}
  // Do not stretch an oblique photo onto a flat side: it introduces perspective twice.
  // A back photograph is only used when explicitly supplied in the standard slot.
  const backTex=null; // Rear photo is not mapped until the admin explicitly labels/calibrates it.
  const measured=Number(width_cm)>0&&Number(height_cm)>0;
  const imageAspect=frontTex?.image?.width&&frontTex?.image?.height?frontTex.image.width/frontTex.image.height:1;
  const aspect=measured?Number(width_cm)/Number(height_cm):imageAspect;
  const h=2.65,w=h*Math.max(.3,Math.min(3.2,aspect)),depth=measured?Math.max(.045,Math.min(.2,h*2.5/Number(height_cm))):.105;
  geo=new THREE.BoxGeometry(w,h,depth);
  // Material order of BoxGeometry: +X,-X,+Y,-Y,+Z,-Z.
  const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=128;
  const fctx=fabricCanvas.getContext('2d');fctx.fillStyle='#e4dfd6';fctx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=4){fctx.fillStyle='rgba(125,112,95,.13)';fctx.fillRect(i,0,1,128);fctx.fillRect(0,i,128,1);fctx.fillStyle='rgba(255,255,255,.32)';fctx.fillRect(i+1,0,1,128);fctx.fillRect(0,i+1,128,1)}
  const fabric=new THREE.CanvasTexture(fabricCanvas);fabric.colorSpace=THREE.SRGBColorSpace;fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(2,4);textures.push(fabric);
  const canvasSide=new THREE.MeshStandardMaterial({map:fabric,color:0xf7f3ed,roughness:.96,metalness:0});
  const canvasTop=new THREE.MeshStandardMaterial({map:fabric,color:0xffffff,roughness:.96,metalness:0});
  // Unlit front face: preserve the source photograph's sRGB colors without scene-light washout.
  const painting=new THREE.MeshBasicMaterial({map:frontTex||null,color:0xffffff,toneMapped:false});
  const backing=new THREE.MeshStandardMaterial({map:backTex||null,color:backTex?0xffffff:0xc3b8a7,roughness:.9});
  mesh=new THREE.Mesh(geo,[canvasSide,canvasSide,canvasTop,canvasTop,painting,backing]);scene.add(mesh);
  // Subtle edge detail, without a fake thick black frame.
  edgeGeo=new THREE.EdgesGeometry(geo);edgeMat=new THREE.LineBasicMaterial({color:0xb5aa9b,transparent:true,opacity:.55});
  mesh.add(new THREE.LineSegments(edgeGeo,edgeMat));
  let yaw=-.26,pitch=.08,zoomFactor=1,velocityX=0,velocityY=0,targetYaw=yaw,targetPitch=pitch,autoTarget=false;
  const go=(y,p)=>{targetYaw=y;targetPitch=p;autoTarget=true;velocityX=velocityY=0};
  frontButton.onclick=()=>go(0,0);sideButton.onclick=()=>go(-Math.PI/2,0);backButton.onclick=()=>go(-Math.PI,0);resetButton.onclick=()=>{zoomFactor=1;resize();go(-.26,.08)};
  const pointers=new Map();let pinchDistance=0;
  stage.addEventListener('pointerdown',e=>{try{stage.setPointerCapture(e.pointerId)}catch{}pointers.set(e.pointerId,[e.clientX,e.clientY]);stage.style.cursor='grabbing'});
  stage.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId))return;
   const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);
   if(pointers.size===2){const p=[...pointers.values()];const d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinchDistance)zoomFactor=Math.max(.55,Math.min(2.5,zoomFactor*d/pinchDistance));resize();pinchDistance=d;return}
   pinchDistance=0;autoTarget=false;velocityX=(e.clientX-prev[0])*.007;velocityY=(e.clientY-prev[1])*.006;yaw+=velocityX;pitch=Math.max(-1.35,Math.min(1.35,pitch+velocityY));
  });
  const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinchDistance=0;if(!pointers.size)stage.style.cursor='grab'};
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  stage.addEventListener('wheel',e=>{e.preventDefault();zoomFactor=Math.max(.55,Math.min(2.5,zoomFactor*(1-e.deltaY*.001)));resize()},{passive:false});
  resize=()=>{if(disposed)return;const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,true);
   // Fit the entire rotated canvas in both axes, including its corners.
   const aspect=rect.width/rect.height,diagonal=Math.hypot(w,h,depth),padding=1.45;
   const visibleHeight=Math.max(h*padding,diagonal*padding,diagonal*padding/aspect)/zoomFactor;
   const halfHeight=visibleHeight/2;
   camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
  };
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(stage)}else{window.addEventListener('resize',resize)}resize();
  function animate(){if(disposed)return;raf=requestAnimationFrame(animate);if(!pointers.size){yaw+=velocityX;pitch=Math.max(-1.35,Math.min(1.35,pitch+velocityY));velocityX*=.89;velocityY*=.89}if(autoTarget){yaw+=(targetYaw-yaw)*.16;pitch+=(targetPitch-pitch)*.16;if(Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch)<.002)autoTarget=false}mesh.rotation.set(pitch,yaw,0);camera.position.set(0,0,8);camera.lookAt(0,0,0);renderer.render(scene,camera);if(loading.isConnected)loading.remove()}animate();
 }catch(e){console.error('NOF viewer',e);if(!loading.isConnected)stage.append(loading);const detail=String(e?.message||e||'Erreur inconnue').slice(0,280);loading.textContent='Erreur de visualisation 3D : '+detail;loading.style.padding='24px';loading.style.textAlign='center';footer.textContent='Erreur technique du visualiseur NOF — ce message ne signifie pas que votre appareil est incompatible.'}
}