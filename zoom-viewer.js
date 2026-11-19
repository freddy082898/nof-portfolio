// NOF high-resolution artwork inspection. Uses the original signed image URL,
// never upscales the underlying file or claims to restore missing detail.
export function showArtworkZoom({title,imageUrl}){
 if(!imageUrl)return;
 const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Zoom haute définition : '+title);
 dialog.style.cssText='position:fixed;inset:0;z-index:10030;background:#171715;color:#f5f2eb;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;flex:none';
 const heading=document.createElement('strong');heading.textContent=title+' · Détails';
 const close=document.createElement('button');close.textContent='Fermer ×';close.style.cssText='background:transparent;color:inherit;border:1px solid #999;border-radius:24px;padding:10px 15px;cursor:pointer';
 header.append(heading,close);
 const stage=document.createElement('div');stage.style.cssText='position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;cursor:grab;display:block';
 const img=document.createElement('img');img.alt='Détails de '+title;img.draggable=false;img.style.cssText='position:absolute;left:0;top:0;display:block;max-width:none;max-height:none;user-select:none;-webkit-user-select:none;transform-origin:0 0;pointer-events:none';
 stage.append(img);
 const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:12px 12px 8px';
 const button=(label)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:10px 16px;border:1px solid #777;background:#272724;color:#fff;border-radius:24px;cursor:pointer';controls.append(b);return b};
 const minus=button('−'),reset=button('Ajuster'),plus=button('+');
 const status=document.createElement('span');status.setAttribute('aria-live','polite');status.style.cssText='font-size:12px;color:#c7c2b8;min-width:50px;text-align:center';controls.append(status);
 const note=document.createElement('p');note.style.cssText='margin:0;padding:4px 14px 18px;text-align:center;font-size:12px;color:#b9b5ac';note.textContent='Pince pour zoomer · Glisse pour explorer · Double-tape pour agrandir';
 dialog.append(header,stage,controls,note);document.body.append(dialog);
 let naturalW=0,naturalH=0,fit=1,scale=1,x=0,y=0,disposed=false;
 const pointers=new Map();let gesture=null;
 function clamp(){const w=stage.clientWidth,h=stage.clientHeight,iw=naturalW*scale,ih=naturalH*scale;
  if(iw<=w)x=(w-iw)/2;else x=Math.max(w-iw,Math.min(0,x));
  if(ih<=h)y=(h-ih)/2;else y=Math.max(h-ih,Math.min(0,y));
 }
 function draw(){if(disposed||!naturalW)return;clamp();img.style.width=naturalW+'px';img.style.height=naturalH+'px';img.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';status.textContent=Math.round(scale/fit*100)+' %'}
 function fitImage(){if(!naturalW||!stage.clientWidth||!stage.clientHeight)return;fit=Math.min(stage.clientWidth/naturalW,stage.clientHeight/naturalH);scale=fit;x=(stage.clientWidth-naturalW*scale)/2;y=(stage.clientHeight-naturalH*scale)/2;draw()}
 function zoom(factor,cx=stage.clientWidth/2,cy=stage.clientHeight/2){if(!naturalW)return;const next=Math.max(fit,Math.min(Math.max(fit*8,1),scale*factor));const ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;draw()}
 img.onload=()=>{naturalW=img.naturalWidth;naturalH=img.naturalHeight;fitImage();note.textContent+=' · Photo source : '+naturalW+' × '+naturalH+' px'};
 img.onerror=()=>{note.textContent='Impossible de charger la photographie originale. Ferme puis réessaie.'};
 img.src=imageUrl;
 if(img.complete&&img.naturalWidth)img.onload();
 const ro=new ResizeObserver(()=>{if(!naturalW)return;const oldFit=fit;fit=Math.min(stage.clientWidth/naturalW,stage.clientHeight/naturalH);if(scale<=oldFit*1.01)fitImage();else draw()});ro.observe(stage);
 const key=e=>{if(e.key==='Escape')destroy();if(e.key==='+'||e.key==='=')zoom(1.3);if(e.key==='-')zoom(1/1.3);if(e.key==='0')fitImage()};
 function destroy(){if(disposed)return;disposed=true;ro.disconnect();window.removeEventListener('keydown',key);dialog.remove()}
 window.addEventListener('keydown',key);close.onclick=destroy;reset.onclick=fitImage;plus.onclick=()=>zoom(1.5);minus.onclick=()=>zoom(1/1.5);
 function local(e){const r=stage.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]}
 function distance(p){return Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])}
 stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,local(e));stage.style.cursor='grabbing';gesture=null});
 stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId),current=local(e);pointers.set(e.pointerId,current);
  if(pointers.size===1){x+=current[0]-previous[0];y+=current[1]-previous[1];draw()}
  else if(pointers.size===2){const p=[...pointers.values()],d=distance(p),center=[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2];if(gesture&&gesture.distance>0){x+=center[0]-gesture.center[0];y+=center[1]-gesture.center[1];zoom(d/gesture.distance,center[0],center[1])}gesture={distance:d,center}}
 });
 const release=e=>{pointers.delete(e.pointerId);gesture=null;if(!pointers.size)stage.style.cursor='grab'};
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
 stage.addEventListener('wheel',e=>{e.preventDefault();const p=local(e);zoom(Math.exp(-e.deltaY*.002),p[0],p[1])},{passive:false});
 let lastTap=0;stage.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const now=performance.now();if(now-lastTap<330){const p=local(e);if(scale>fit*1.8)fitImage();else zoom(2.5,p[0],p[1]);lastTap=0}else lastTap=now});
}
