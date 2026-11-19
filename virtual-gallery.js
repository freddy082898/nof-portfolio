import * as THREE from 'https://esm.sh/three@0.170.0';

// A guided virtual exhibition. Works are shown only when a published photo exists.
// Dimensions are proportional when known; otherwise the aspect ratio is taken from the photo.
export async function showVirtualGallery(artworks=[]){
 const works=artworks.filter(a=>a.imageUrl).slice(0,12);
 if(!works.length){alert('Aucune œuvre photographiée à exposer pour le moment.');return}
 const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Exposition virtuelle NOF');
 modal.style.cssText='position:fixed;inset:0;z-index:10040;background:#e9e5dc;color:#25231f;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:13px 17px;gap:12px;background:#f8f6f1';
 const heading=document.createElement('strong');heading.textContent='NOF · Exposition virtuelle';
 const close=document.createElement('button');close.textContent='Fermer ×';close.style.cssText='border:1px solid #a69f92;background:transparent;border-radius:22px;padding:10px 15px;color:inherit;cursor:pointer';
 header.append(heading,close);
 const stage=document.createElement('div');stage.style.cssText='position:relative;flex:1;min-height:0;touch-action:pan-y;background:#e9e5dc';
 const hint=document.createElement('div');hint.style.cssText='position:absolute;top:15px;left:15px;right:15px;pointer-events:none;text-align:center;font-size:12px;color:#49453e;text-shadow:0 1px 4px #fff';hint.textContent='Glisser pour regarder · Avancer ou reculer avec les commandes · Toucher une œuvre';stage.append(hint);
 const info=document.createElement('div');info.style.cssText='background:#f8f6f1;padding:12px 16px;text-align:center;font-size:13px;min-height:42px';info.setAttribute('aria-live','polite');info.textContent='Une sélection d’œuvres originales';
 const controls=document.createElement('div');controls.style.cssText='display:flex;align-items:center;justify-content:center;gap:9px;padding:12px 10px 16px;background:#f8f6f1';
 const button=(label)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='background:#272520;color:#fff;border:0;border-radius:22px;padding:12px 16px;cursor:pointer;font:13px system-ui';controls.append(b);return b};
 const prev=button('← Œuvre'),back=button('− Reculer'),home=button('Vue générale'),forward=button('+ Avancer'),next=button('Œuvre →');
 controls.style.flexWrap='wrap';
 modal.append(header,stage,info,controls);document.body.append(modal);
 const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 let renderer,scene,camera,raf=0,disposed=false,resizeObserver;const resources=[],textures=[],artMeshes=[];
 let selected=0,targetYaw=0,yaw=0,targetX=0,targetZ=0,dragging=false,dragStartX=0,dragStartY=0,dragMoved=false,previousX=0;
 const key=e=>{if(e.key==='Escape')destroy();if(e.key==='ArrowRight')focus(selected+1);if(e.key==='ArrowLeft')focus(selected-1)};
 function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('keydown',key);resources.forEach(r=>r.dispose());textures.forEach(t=>t.dispose());renderer?.dispose();document.body.style.overflow=oldOverflow;modal.remove()}
 close.onclick=destroy;window.addEventListener('keydown',key);
 try{
 scene=new THREE.Scene();scene.background=new THREE.Color('#e9e5dc');
 camera=new THREE.PerspectiveCamera(48,1,.1,80);camera.position.set(0,1.65,0);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';stage.insertBefore(renderer.domElement,hint);
 const material=(color,roughness=1)=>{const m=new THREE.MeshStandardMaterial({color,roughness});resources.push(m);return m};
 const wall=material('#eeeae2'),floor=material('#b8afa1'),trim=material('#d3cbbf'),frameMat=material('#312d28'),matte=material('#fbfaf7');
 const box=(w,h,d,x,y,z,m)=>{const g=new THREE.BoxGeometry(w,h,d);resources.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);scene.add(mesh);return mesh};
 // 18 x 18 metre square room with four exhibition walls.
 box(18,.12,18,0,-.07,0,floor);box(18,5,.18,0,2.5,-9,wall);box(18,5,.18,0,2.5,9,wall);box(.18,5,18,-9,2.5,0,wall);box(.18,5,18,9,2.5,0,wall);
 box(18,.13,.14,0,.14,-8.87,trim);box(18,.13,.14,0,.14,8.87,trim);box(.14,.13,18,-8.87,.14,0,trim);box(.14,.13,18,8.87,.14,0,trim);
 scene.add(new THREE.HemisphereLight(0xffffff,0xb8ae9f,2.3));
 for(const [x,z] of [[-5,-5],[5,-5],[-5,5],[5,5]]){const light=new THREE.PointLight(0xfff5e5,24,15,2);light.position.set(x,4.2,z);scene.add(light)}
 const loader=new THREE.TextureLoader();
 const slots=[];
 // Each wall has three positions, all works face the room centre.
 for(let i=0;i<12;i++){const side=Math.floor(i/3),col=i%3,offset=(col-1)*5.35;
  if(side===0)slots.push({x:offset,z:-8.76,ry:0});
  if(side===1)slots.push({x:8.76,z:offset,ry:-Math.PI/2});
  if(side===2)slots.push({x:-offset,z:8.76,ry:Math.PI});
  if(side===3)slots.push({x:-8.76,z:-offset,ry:Math.PI/2});
 }
 const planeGeo=new THREE.PlaneGeometry(1,1);resources.push(planeGeo);
 function labelTexture(work,i){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,768,192);ctx.fillStyle='#302d27';ctx.font='600 33px Georgia,serif';ctx.fillText((i+1).toString().padStart(2,'0')+'  '+String(work.title).slice(0,29),26,68);ctx.font='25px Arial,sans-serif';ctx.fillStyle='#777067';ctx.fillText([work.technique,work.width_cm&&work.height_cm?work.width_cm+' × '+work.height_cm+' cm':null,work.year_created].filter(Boolean).join(' · ').slice(0,55),26,128);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;textures.push(tex);return tex}
 await Promise.all(works.map(async(work,i)=>{
  try{
   const texture=await loader.loadAsync(work.imageUrl);if(disposed){texture.dispose();return}
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
   const aspect=Number(work.width_cm)>0&&Number(work.height_cm)>0?Number(work.width_cm)/Number(work.height_cm):texture.image.width/texture.image.height;
   const h=Math.min(2.4,2.5/Math.max(.6,aspect)),w=Math.min(3.4,h*aspect);
   const slot=slots[i],group=new THREE.Group();group.position.set(slot.x,1.85,slot.z);group.rotation.y=slot.ry;scene.add(group);
   const frame=new THREE.Mesh(new THREE.BoxGeometry(w+.13,h+.13,.09),frameMat);resources.push(frame.geometry);group.add(frame);
   const border=new THREE.Mesh(new THREE.BoxGeometry(w+.035,h+.035,.012),matte);resources.push(border.geometry);border.position.z=.052;group.add(border);
   const pictureMat=new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide});resources.push(pictureMat);
   const picture=new THREE.Mesh(planeGeo,pictureMat);picture.scale.set(w,h,1);picture.position.z=.063;picture.userData.index=i;group.add(picture);artMeshes.push(picture);
   const captionMaterial=new THREE.MeshBasicMaterial({map:labelTexture(work,i),side:THREE.DoubleSide});resources.push(captionMaterial);const caption=new THREE.Mesh(planeGeo,captionMaterial);caption.scale.set(Math.min(2.25,w),.48,1);caption.position.set(0,-h/2-.39,.075);group.add(caption);
  }catch(err){console.warn('Photographie non chargée dans la galerie virtuelle',work.title,err)}
 }));
 if(disposed)return;
 if(!artMeshes.length){info.textContent='Impossible de charger les photographies. Ferme puis réessaie.'}
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function focus(i){selected=(i+works.length)%works.length;const slot=slots[selected];const dir=new THREE.Vector3(slot.x,1.85,slot.z).sub(new THREE.Vector3(targetX,1.65,targetZ));targetYaw=Math.atan2(-dir.x,-dir.z);const w=works[selected];info.textContent=(selected+1)+' / '+works.length+' · '+w.title+' · '+(w.technique||'Œuvre originale')+[w.width_cm&&w.height_cm?w.width_cm+' × '+w.height_cm+' cm':null,w.year_created].filter(Boolean).map(x=>' · '+x).join('')}
 function overview(){targetX=0;targetZ=0;targetYaw=0;info.textContent='Vue générale · Glisser pour regarder autour de soi'}
 function move(distance){const dx=-Math.sin(targetYaw)*distance,dz=-Math.cos(targetYaw)*distance;targetX=Math.max(-7.4,Math.min(7.4,targetX+dx));targetZ=Math.max(-7.4,Math.min(7.4,targetZ+dz));info.textContent='Déplacement dans la salle · '+Math.round(Math.hypot(targetX,targetZ)*10)/10+' m du centre'}
 function pick(clientX,clientY){const rect=renderer.domElement.getBoundingClientRect();pointer.x=(clientX-rect.left)/rect.width*2-1;pointer.y=-(clientY-rect.top)/rect.height*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(artMeshes,false)[0];if(hit){focus(hit.object.userData.index);return true}return false}
 let lastTap=0;
 renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;dragMoved=false;dragStartX=e.clientX;dragStartY=e.clientY;previousX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});
 renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;if(Math.hypot(e.clientX-dragStartX,e.clientY-dragStartY)>7)dragMoved=true;targetYaw-=(e.clientX-previousX)*.006;previousX=e.clientX});
 renderer.domElement.addEventListener('pointerup',e=>{if(!dragMoved){const tapped=pick(e.clientX,e.clientY);const now=performance.now();if(tapped&&now-lastTap<400){const work=works[selected];import('./zoom-viewer.js').then(m=>m.showArtworkZoom({title:work.title,imageUrl:work.imageUrl})).catch(console.error)}lastTap=now}dragging=false});
 renderer.domElement.addEventListener('pointercancel',()=>{dragging=false});
 prev.onclick=()=>focus(selected-1);next.onclick=()=>focus(selected+1);home.onclick=overview;forward.onclick=()=>move(1.3);back.onclick=()=>move(-1.3);
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();focus(0);
 function animate(){if(disposed)return;raf=requestAnimationFrame(animate);let delta=(targetYaw-yaw+Math.PI)%(Math.PI*2);if(delta<0)delta+=Math.PI*2;delta-=Math.PI;yaw+=delta*.11;camera.rotation.set(0,yaw,0);camera.position.x+=(targetX-camera.position.x)*.12;camera.position.z+=(targetZ-camera.position.z)*.12;renderer.render(scene,camera)}animate();
 }catch(err){console.error('NOF exposition 3D',err);info.textContent='La galerie 3D est indisponible sur cet appareil.';close.textContent='Fermer'}
}
