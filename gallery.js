import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const sb=createClient('https://gajbqvsxsmmchnfvweay.supabase.co','sb_publishable_PaYWt1IJjs3zgdhe28lomg_CCKlHER8');
const gallery=document.getElementById('nof-gallery');
try{
const {data,error}=await sb.from('artworks').select('title,technique,width_cm,height_cm,year_created,status,image_path,created_at').eq('published',true).order('created_at',{ascending:false});
if(error)throw error;
gallery.replaceChildren();
if(!data?.length){const p=document.createElement('p');p.textContent='La collection sera dévoilée prochainement.';gallery.append(p)}
for(const art of data||[]){
const article=document.createElement('article');article.className='work-card reveal visible';
const frame=document.createElement('div');frame.className='work-image';frame.tabIndex=0;frame.setAttribute('role','button');frame.setAttribute('aria-label','Voir '+art.title);
const img=document.createElement('img');img.alt='Peinture originale : '+art.title;img.style.display='block';img.style.objectFit='contain';img.style.background='#fff';
if(art.image_path){const {data:signed}=await sb.storage.from('artworks-images').createSignedUrl(art.image_path,3600);if(signed?.signedUrl)img.src=signed.signedUrl}
if(!img.src){const placeholder=document.createElement('div');placeholder.className='art-placeholder';placeholder.textContent='NOF';frame.append(placeholder)}else frame.append(img);
frame.addEventListener('click',()=>{if(img.src){document.getElementById('lightboxImg').src=img.src;document.getElementById('lightbox').classList.add('open')}});
frame.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();frame.click()}});
const meta=document.createElement('div');meta.className='work-meta';const inner=document.createElement('div');const title=document.createElement('h3');title.textContent=art.title;const details=document.createElement('p');details.textContent=[art.technique,art.width_cm&&art.height_cm?art.width_cm+' × '+art.height_cm+' cm':null,art.year_created,art.status==='sold'?'Vendu':art.status==='reserved'?'Réservé':null].filter(Boolean).join(' · ');inner.append(title,details);meta.append(inner);article.append(frame,meta);gallery.append(article)
}
}catch(e){console.error(e);gallery.textContent='La collection est momentanément indisponible.'}