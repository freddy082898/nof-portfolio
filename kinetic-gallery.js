// NOF Kinetic Matter: accessible, touch-driven 3D carousel using only published artwork photos.
const viewport=document.getElementById('kinetic-viewport');
const ring=document.getElementById('kinetic-ring');
const count=document.getElementById('kinetic-count');
const prev=document.getElementById('kinetic-prev');
const next=document.getElementById('kinetic-next');
const gallery=document.getElementById('nof-gallery');
if(viewport&&ring&&gallery){
  let works=[],active=0,current=0,target=0,dragStart=null,lastX=0,moved=false,raf=0,paused=false,lastSwipeAt=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fallback=[{title:'NOF / La matière',src:''},{title:'NOF / Le geste',src:''},{title:'NOF / La lumière',src:''},{title:'NOF / Le regard',src:''},{title:'NOF / La trace',src:''}];
  function collect(){
    const found=[...gallery.querySelectorAll('.work-card')].map((el,i)=>({title:el.querySelector('h3')?.textContent||'Œuvre '+(i+1),src:el.querySelector('img')?.src||'',el})).filter(x=>x.src);
    const fresh=found.length?found:fallback;
    if(JSON.stringify(fresh.map(x=>x.src))===JSON.stringify(works.map(x=>x.src)))return;
    works=fresh;active=0;target=0;current=0;render();
  }
  function radius(){const width=viewport.getBoundingClientRect().width||innerWidth;return Math.max(width<760?165:280,Math.min(width*.37,500))}
  function render(){
    ring.replaceChildren();
    works.forEach((work,i)=>{
      const card=document.createElement('button');card.type='button';card.className='kinetic-card';card.setAttribute('aria-label','Voir '+work.title);
      if(work.src){const img=document.createElement('img');img.src=work.src;img.alt=work.title;img.loading=i<3?'eager':'lazy';card.append(img)}
      else{const placeholder=document.createElement('span');placeholder.className='kinetic-placeholder';placeholder.textContent='NOF';card.append(placeholder)}
      const label=document.createElement('span');label.className='kinetic-card-title';label.textContent=work.title;card.append(label);
      card.addEventListener('click',()=>{if(moved)return;if(i===active){document.getElementById('oeuvres')?.scrollIntoView({behavior:reduced?'instant':'smooth'});work.el?.querySelector('.work-image')?.focus({preventScroll:true})}else go(i)});
      ring.append(card);
    });
    update();
  }
  function update(){
    const n=works.length||1;
    const r=radius();
    [...ring.children].forEach((card,i)=>{
      const angle=n===1?current*Math.PI/2:(i-current)*Math.PI*2/n;
      const x=n===1?0:Math.sin(angle)*r,z=n===1?0:Math.cos(angle)*r-r;
      card.style.transform='translate3d('+x.toFixed(1)+'px,0,'+z.toFixed(1)+'px) rotateY('+(n===1?(-current*45):(-Math.sin(angle)*22)).toFixed(1)+'deg)';
      const distance=Math.abs(((i-current+n*10+n/2)%n)-n/2);
      card.style.opacity=String(Math.max(.3,1-distance*.19));
      card.classList.toggle('is-front',i===active);
      card.style.zIndex=String(Math.max(1,Math.round(1000+z)));
    });
    count.textContent=String(active+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
  }
  function tick(){const delta=target-current;current=reduced?target:current+delta*.105;update();if(Math.abs(target-current)>.001){raf=requestAnimationFrame(tick)}else{current=target;update();raf=0}}
  function animate(){if(!raf)raf=requestAnimationFrame(tick)}
  function go(i){const n=works.length||1;if(n===1){active=0;target+=(i>0?1:-1);animate();return}const normalized=((i%n)+n)%n;let diff=normalized-active;if(diff>n/2)diff-=n;if(diff< -n/2)diff+=n;active=normalized;target+=diff;animate()}
  prev.addEventListener('click',()=>go(active-1));next.addEventListener('click',()=>go(active+1));
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(active+(e.key==='ArrowRight'?1:-1))}});
  viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragStart=e.clientX;lastX=e.clientX;moved=false;try{viewport.setPointerCapture(e.pointerId)}catch{}});
  viewport.addEventListener('pointermove',e=>{if(dragStart===null)return;const delta=e.clientX-dragStart;if(Math.abs(delta)>12)moved=true;lastX=e.clientX});
  function end(){if(dragStart===null)return;const delta=lastX-dragStart;dragStart=null;if(Math.abs(delta)>25){lastSwipeAt=Date.now();go(active+(delta<0?1:-1))}if(moved)setTimeout(()=>{moved=false},200)}
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  // Touch fallback for older iOS Safari versions without reliable pointer capture.
  let touchX=null;
  viewport.addEventListener('touchstart',e=>{touchX=e.changedTouches[0]?.clientX??null},{passive:true});
  viewport.addEventListener('touchend',e=>{if(touchX===null)return;const delta=(e.changedTouches[0]?.clientX??touchX)-touchX;touchX=null;if(Math.abs(delta)>35&&dragStart===null&&Date.now()-lastSwipeAt>350){lastSwipeAt=Date.now();moved=true;go(active+(delta<0?1:-1));setTimeout(()=>{moved=false},200)}},{passive:true});
  addEventListener('resize',()=>update(),{passive:true});
  const observer=new MutationObserver(()=>{if(gallery.querySelector('.work-card'))collect()});
  observer.observe(gallery,{childList:true,subtree:true});
  works=fallback;render();collect();
  if(!reduced){let last=performance.now();const auto=now=>{if(document.visibilityState==='visible'&&!paused&&now-last>5500&&dragStart===null){go(active+1);last=now}requestAnimationFrame(auto)};requestAnimationFrame(auto)}
  const visibility=new IntersectionObserver(entries=>{paused=!entries[0]?.isIntersecting},{threshold:.05});visibility.observe(viewport);
}
