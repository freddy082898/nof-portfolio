// NOF "Voir chez moi": metric artwork overlay with two-point wall calibration.
// Real-size display is possible only after the user measures a reference in the room photo.
export async function showArtworkInRoom({title,width_cm,height_cm,imageUrl}){
 const w=Number(width_cm),h=Number(height_cm);
 if(!(w>0&&h>0))return alert('Renseigne d’abord la largeur et la hauteur réelles du tableau dans NOF Studio.');
 const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Voir '+title+' dans une pièce');
 modal.style.cssText='position:fixed;inset:0;z-index:10001;background:#f4f1eb;color:#24211e;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif';
 const header=document.createElement('header');header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:10px;flex:none;background:#f4f1eb';
 const heading=document.createElement('strong');heading.textContent='NOF · Voir chez moi';
 const close=document.createElement('button');close.textContent='Fermer ×';close.style.cssText='border:1px solid #aaa;border-radius:24px;background:transparent;padding:9px 14px;color:inherit;cursor:pointer';
 header.append(heading,close);
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 16px;background:#fff;flex:none;font-size:13px';
 const upload=document.createElement('input');upload.type='file';upload.accept='image/*';upload.setAttribute('aria-label','Photographier ou importer une pièce');upload.style.cssText='max-width:100%;font-size:12px';
 const label=document.createElement('label');label.textContent='Distance réelle entre les deux points (cm) ';
 const measure=document.createElement('input');measure.type='number';measure.min='1';measure.step='.1';measure.value='100';measure.style.cssText='width:76px;padding:7px;border:1px solid #bbb;margin-left:6px';
 label.append(measure);
 const calibrate=document.createElement('button');calibrate.textContent='Calibrer (2 points)';calibrate.style.cssText='padding:9px 12px;border:1px solid #bbb;background:#f4f1eb;color:#222;cursor:pointer';
 const reset=document.createElement('button');reset.textContent='Recentrer';reset.style.cssText='padding:9px 12px;border:1px solid #bbb;background:#f4f1eb;color:#222;cursor:pointer';
 controls.append(upload,label,calibrate,reset);
 const stage=document.createElement('div');stage.style.cssText='position:relative;flex:1;min-height:0;overflow:hidden;background:#e9e4da;touch-action:none';
 const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';stage.append(canvas);
 const note=document.createElement('div');note.style.cssText='background:#f4f1eb;flex:none;padding:12px 18px 20px;text-align:center;font-size:12px;line-height:1.5;color:#5b544d';
 modal.append(header,controls,stage,note);document.body.append(modal);
 const ctx=canvas.getContext('2d');let room=null,art=null,roomUrl=null,mode='normal',points=[],pixelsPerCm=null,position=[.5,.46],drag=false,dragStart=null;
 const load=url=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=reject;im.src=url});
 try{art=await load(imageUrl)}catch(e){note.textContent='La photo du tableau ne peut pas être chargée.'}
 let destroyed=false;
 const key=e=>{if(e.key==='Escape')destroy()};
 function destroy(){if(destroyed)return;destroyed=true;window.removeEventListener('keydown',key);observer.disconnect();if(roomUrl)URL.revokeObjectURL(roomUrl);modal.remove()}
 window.addEventListener('keydown',key);close.onclick=destroy;
 function dimensions(){const box=stage.getBoundingClientRect();return {width:box.width,height:box.height}}
 function roomBounds(){const {width:W,height:H}=dimensions();if(!room)return null;const scale=Math.min(W/room.width,H/room.height);return {x:(W-room.width*scale)/2,y:(H-room.height*scale)/2,width:room.width*scale,height:room.height*scale,scale}}
 function toRoom(e){const rect=canvas.getBoundingClientRect(),bounds=roomBounds();if(!bounds)return null;return [(e.clientX-rect.left-bounds.x)/bounds.scale,(e.clientY-rect.top-bounds.y)/bounds.scale]}
 function draw(){
  if(destroyed)return;const {width:W,height:H}=dimensions();if(W<1||H<1)return;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#e9e4da';ctx.fillRect(0,0,W,H);
  if(!room){ctx.fillStyle='#696158';ctx.textAlign='center';ctx.font='15px system-ui';ctx.fillText('Ajoute une photo de ta pièce',W/2,H/2);return}
  const b=roomBounds();ctx.drawImage(room,b.x,b.y,b.width,b.height);
  if(art&&pixelsPerCm){
   const aw=w*pixelsPerCm*b.scale,ah=h*pixelsPerCm*b.scale;
   const x=b.x+position[0]*b.width-aw/2,y=b.y+position[1]*b.height-ah/2;
   ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=13;ctx.shadowOffsetY=8;
   ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,aw+4,ah+4);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.drawImage(art,x,y,aw,ah);
   ctx.strokeStyle='rgba(50,40,30,.35)';ctx.lineWidth=1;ctx.strokeRect(x,y,aw,ah);
  }
  if(points.length){ctx.fillStyle='#e9a927';ctx.strokeStyle='#e9a927';ctx.lineWidth=2;points.forEach(p=>{ctx.beginPath();ctx.arc(b.x+p[0]*b.scale,b.y+p[1]*b.scale,7,0,Math.PI*2);ctx.fill()});if(points.length===2){ctx.beginPath();ctx.moveTo(b.x+points[0][0]*b.scale,b.y+points[0][1]*b.scale);ctx.lineTo(b.x+points[1][0]*b.scale,b.y+points[1][1]*b.scale);ctx.stroke()}}
 }
 const observer=new ResizeObserver(draw);observer.observe(stage);
 upload.onchange=async()=>{const file=upload.files[0];if(!file)return;try{if(roomUrl)URL.revokeObjectURL(roomUrl);roomUrl=URL.createObjectURL(file);room=await load(roomUrl);pixelsPerCm=null;points=[];position=[.5,.46];note.textContent='Photo chargée. Mesure une distance sur le mur (par exemple 100 cm), puis calibre avec deux points sur cette même surface.';draw()}catch(e){note.textContent='Impossible de lire cette photo.'}};
 calibrate.onclick=()=>{if(!room)return;mode='calibrate';points=[];note.textContent='Touche deux points sur le mur correspondant à la distance indiquée en centimètres.';draw()};
 reset.onclick=()=>{position=[.5,.46];draw()};
 canvas.addEventListener('pointerdown',e=>{if(!room)return;const p=toRoom(e);if(!p)return;if(mode==='calibrate'){points.push(p);if(points.length===2){const distance=Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1]);const cm=Number(measure.value);if(distance>5&&cm>0){pixelsPerCm=distance/cm;mode='normal';note.textContent=title+' · '+w+' × '+h+' cm · Échelle calibrée sur la photo. Glisse le tableau pour le placer.'}else{points=[];note.textContent='Distance invalide. Recommence.'}}draw();return}drag=true;dragStart=p;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!drag||!room)return;const p=toRoom(e);if(!p)return;position[0]+=(p[0]-dragStart[0])/room.width;position[1]+=(p[1]-dragStart[1])/room.height;dragStart=p;draw()});
 const stop=()=>{drag=false};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
 note.textContent='Importe une photo de ta pièce, puis calibre une distance mesurée sur le mur pour afficher le tableau à l’échelle. Une photo seule ne permet pas de connaître les dimensions réelles.';
 draw();
}
