import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const sb=createClient('https://gajbqvsxsmmchnfvweay.supabase.co','sb_publishable_PaYWt1IJjs3zgdhe28lomg_CCKlHER8');
const gallery=document.getElementById('nof-gallery');
try{
const {data,error}=await sb.from('artworks').select('id,title,description,technique,width_cm,height_cm,year_created,status,price_eur,image_path,created_at').eq('published',true).order('created_at',{ascending:false});
if(error)throw error;
gallery.replaceChildren();
if(!data?.length){const p=document.createElement('p');p.textContent='La collection sera dévoilée prochainement.';gallery.append(p)}
for(const art of data||[]){
const article=document.createElement('article');article.className='work-card reveal visible';
const frame=document.createElement('div');frame.className='work-image';frame.tabIndex=0;frame.setAttribute('role','button');frame.setAttribute('aria-label','Voir '+art.title);
const img=document.createElement('img');img.alt='Peinture originale : '+art.title;img.style.display='block';img.style.objectFit='contain';img.style.background='#fff';
if(art.image_path){const {data:signed}=await sb.storage.from('artworks-images').createSignedUrl(art.image_path,3600);if(signed?.signedUrl)img.src=signed.signedUrl}
if(!img.src){const placeholder=document.createElement('div');placeholder.className='art-placeholder';placeholder.textContent='NOF';frame.append(placeholder)}else frame.append(img);
const {data:views,error:viewsError}=await sb.from('artwork_views').select('angle_index,image_path').eq('artwork_id',art.id).order('angle_index');
if(viewsError)console.warn('Vues indisponibles',viewsError);
const urls=[];for(const view of views||[]){const result=await sb.storage.from('artworks-images').createSignedUrl(view.image_path,3600);if(result.data?.signedUrl)urls[view.angle_index]=result.data.signedUrl}
if(!urls.some(Boolean)&&img.src)urls[0]=img.src;
async function openViewer(){if(!urls.some(Boolean))return;try{const {showArtwork3D}=await import('./viewer3d.js');await showArtwork3D({title:art.title,width_cm:art.width_cm,height_cm:art.height_cm,front:img.src||urls[0],views:urls})}catch(e){console.error(e);alert('Impossible de lancer la visualisation 3D sur cet appareil.')}}
frame.addEventListener('click',openViewer);
frame.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openViewer()}});
const meta=document.createElement('div');meta.className='work-meta';meta.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:center';const inner=document.createElement('div');const title=document.createElement('h3');title.textContent=art.title;const details=document.createElement('p');details.textContent=[art.technique,art.width_cm&&art.height_cm?art.width_cm+' × '+art.height_cm+' cm':null,art.year_created,art.status==='sold'?'Vendu':art.status==='reserved'?'Réservé':null].filter(Boolean).join(' · ');inner.append(title,details);meta.append(inner);
const detailButton=document.createElement('button');detailButton.type='button';detailButton.textContent='Découvrir l’œuvre';detailButton.setAttribute('aria-label','Découvrir les détails de '+art.title);detailButton.style.cssText='background:transparent;border:1px solid #777;padding:11px 13px;cursor:pointer;font-size:11px;letter-spacing:.08em;white-space:normal;color:inherit;max-width:100%';
detailButton.onclick=()=>{const overlay=document.createElement('div');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Détails de '+art.title);overlay.style.cssText='position:fixed;inset:0;z-index:10020;background:rgba(20,18,16,.85);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,sans-serif;color:#29251f';
const panel=document.createElement('section');panel.style.cssText='position:relative;background:#f7f5f1;width:min(760px,100%);max-height:92vh;overflow:auto;padding:clamp(18px,4vw,38px);box-shadow:0 24px 70px #0005';
const dismiss=document.createElement('button');dismiss.textContent='Fermer ×';dismiss.style.cssText='float:right;background:transparent;border:1px solid #aaa;border-radius:20px;padding:8px 12px;cursor:pointer;color:inherit';
const heading=document.createElement('h2');heading.textContent=art.title;heading.style.cssText='font:normal clamp(28px,5vw,48px) Georgia,serif;margin:20px 0';
panel.append(dismiss,heading);
if(img.src){const photo=document.createElement('img');photo.src=img.src;photo.alt=img.alt;photo.style.cssText='display:block;width:100%;max-height:45vh;object-fit:contain;background:#fff';panel.append(photo)}
const desc=document.createElement('p');desc.textContent=art.description||'Œuvre originale NOF';desc.style.cssText='white-space:pre-wrap;line-height:1.7';panel.append(desc);
const info=document.createElement('p');info.textContent=[art.technique,art.width_cm&&art.height_cm?art.width_cm+' × '+art.height_cm+' cm':null,art.year_created,art.status==='sold'?'Vendue':art.status==='reserved'?'Réservée':'Disponible'].filter(Boolean).join(' · ');info.style.cssText='font-size:13px;color:#625d55;line-height:1.7';panel.append(info);
if(art.price_eur!==null&&art.price_eur!==undefined){const price=document.createElement('p');price.textContent=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(art.price_eur);price.style.cssText='font:normal 25px Georgia,serif';panel.append(price)}
const share=document.createElement('button');share.textContent='Copier la référence de l’œuvre';share.style.cssText='padding:12px 16px;border:1px solid #777;background:transparent;color:inherit;cursor:pointer';
share.onclick=async()=>{try{await navigator.clipboard.writeText('NOF — '+art.title+' ('+art.id+')');share.textContent='Référence copiée'}catch(e){share.textContent='Référence : '+art.id}};
panel.append(share);overlay.append(panel);document.body.append(overlay);
const key=e=>{if(e.key==='Escape')close()};function close(){window.removeEventListener('keydown',key);overlay.remove()}dismiss.onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};window.addEventListener('keydown',key);
};meta.append(detailButton);
if(Number(art.width_cm)>0&&Number(art.height_cm)>0&&img.src){
 const roomButton=document.createElement('button');roomButton.type='button';roomButton.textContent='Voir chez moi';roomButton.setAttribute('aria-label','Visualiser '+art.title+' dans ma pièce');
 roomButton.style.cssText='background:transparent;border:1px solid #777;padding:11px 13px;cursor:pointer;font-size:11px;letter-spacing:.08em;white-space:nowrap;color:inherit';
 roomButton.onclick=async()=>{roomButton.disabled=true;try{const {showArtworkInRoom}=await import('./room-viewer.js');await showArtworkInRoom({title:art.title,width_cm:art.width_cm,height_cm:art.height_cm,imageUrl:img.src})}catch(e){console.error(e);alert('Visualisation dans une pièce indisponible.')}finally{roomButton.disabled=false}};
 meta.append(roomButton);
}
article.append(frame,meta);gallery.append(article)
}
}catch(e){console.error(e);gallery.textContent='La collection est momentanément indisponible.'}