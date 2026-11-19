import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const sb=createClient('https://gajbqvsxsmmchnfvweay.supabase.co','sb_publishable_PaYWt1IJjs3zgdhe28lomg_CCKlHER8');
const gallery=document.getElementById('nof-gallery');
try{
const {data,error}=await sb.from('artworks').select('id,title,technique,width_cm,height_cm,year_created,status,image_path,created_at').eq('published',true).order('created_at',{ascending:false});
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
const meta=document.createElement('div');meta.className='work-meta';const inner=document.createElement('div');const title=document.createElement('h3');title.textContent=art.title;const details=document.createElement('p');details.textContent=[art.technique,art.width_cm&&art.height_cm?art.width_cm+' × '+art.height_cm+' cm':null,art.year_created,art.status==='sold'?'Vendu':art.status==='reserved'?'Réservé':null].filter(Boolean).join(' · ');inner.append(title,details);meta.append(inner);
if(Number(art.width_cm)>0&&Number(art.height_cm)>0&&img.src){
 const roomButton=document.createElement('button');roomButton.type='button';roomButton.textContent='Voir chez moi';roomButton.setAttribute('aria-label','Visualiser '+art.title+' dans ma pièce');
 roomButton.style.cssText='background:transparent;border:1px solid #777;padding:11px 13px;cursor:pointer;font-size:11px;letter-spacing:.08em;white-space:nowrap;color:inherit';
 roomButton.onclick=async()=>{roomButton.disabled=true;try{const {showArtworkInRoom}=await import('./room-viewer.js');await showArtworkInRoom({title:art.title,width_cm:art.width_cm,height_cm:art.height_cm,imageUrl:img.src})}catch(e){console.error(e);alert('Visualisation dans une pièce indisponible.')}finally{roomButton.disabled=false}};
 meta.append(roomButton);
}
article.append(frame,meta);gallery.append(article)
}
}catch(e){console.error(e);gallery.textContent='La collection est momentanément indisponible.'}