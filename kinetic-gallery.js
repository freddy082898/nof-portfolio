// NOF Kinetic Matter: accessible, touch-driven 3D carousel using only published artwork photos.
const viewport=document.getElementById('kinetic-viewport');
const ring=document.getElementById('kinetic-ring');
const count=document.getElementById('kinetic-count');
const prev=document.getElementById('kinetic-prev');
const next=document.getElementById('kinetic-next');
const gallery=document.getElementById('nof-gallery');
if(viewport&&ring&&gallery){
  let works=[],active=0,current=0,target=0,dragStart=null,lastX=0,moved=false,raf=0,paused=false,lastSwipeAt=0,mode='circle',mix=1,modeRaf=0;
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
      card.addEventListener('click',()=>{if(moved)return;if(work.el?.querySelector('.work-image')){work.el.querySelector('.work-image').click()}else go(i)});
      ring.append(card);
    });
    update();
  }
  function update(){
    const n=works.length||1,r=radius(),width=viewport.clientWidth||innerWidth,mobile=width<760;
    [...ring.children].forEach((card,i)=>{
      let d=i-current;if(n>1){d=((d+n*50+n/2)%n)-n/2}
      const angle=n===1?0:d*Math.PI*2/n;
      const circle={x:Math.sin(angle)*r,y:0,z:Math.cos(angle)*r-r,ry:-Math.sin(angle)*24,rz:0};
      const fan={x:d*(mobile?94:170),y:Math.abs(d)*(mobile?15:24),z:-Math.abs(d)*65,ry:d*-12,rz:d*-(mobile?9:12)};
      const tunnel={x:Math.sin(angle)*r*.62,y:Math.cos(angle)*r*.38,z:-Math.abs(d)*(mobile?135:210),ry:-Math.sin(angle)*25,rz:0};
      const galleryLayout={x:d*(mobile?160:290),y:0,z:-Math.abs(d)*95,ry:d*-8,rz:0};
      const targetLayout={circle,fan,tunnel,gallery:galleryLayout}[mode]||circle;
      const blend=(k)=>circle[k]*(1-mix)+targetLayout[k]*mix;
      const x=blend('x'),y=blend('y'),z=blend('z'),ry=blend('ry'),rz=blend('rz');
      card.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,'+z.toFixed(1)+'px) rotateY('+ry.toFixed(1)+'deg) rotateZ('+rz.toFixed(1)+'deg)';
      card.style.opacity=String(Math.max(.38,1-Math.abs(d)*.16));
      card.classList.toggle('is-front',i===active);
      card.style.zIndex=String(Math.round(10000+z));
    });
    count.textContent=String(active+1).padStart(2,'0')+' / '+String(n).padStart(2,'0');
  }
  function setMode(next){
    if(!['circle','fan','tunnel','gallery'].includes(next)||mode===next)return;
    mode=next;
    document.querySelectorAll('[data-kinetic-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kineticMode===mode)));
    cancelAnimationFrame(modeRaf);
    if(reduced){mix=1;update();return}
    const start=performance.now(),duration=850;
    const animateMode=now=>{const t=Math.min(1,(now-start)/duration);mix=t*t*(3-2*t);update();if(t<1)modeRaf=requestAnimationFrame(animateMode)};
    mix=0;modeRaf=requestAnimationFrame(animateMode);
  }
  document.querySelectorAll('[data-kinetic-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.kineticMode)));
  function tick(){const delta=target-current;current=reduced?target:current+delta*.105;update();if(Math.abs(target-current)>.001){raf=requestAnimationFrame(tick)}else{current=target;update();raf=0}}
  function animate(){if(!raf)raf=requestAnimationFrame(tick)}
  function go(i){const n=works.length||1;if(n===1){active=0;return}const normalized=((i%n)+n)%n;let diff=normalized-active;if(diff>n/2)diff-=n;if(diff< -n/2)diff+=n;active=normalized;target+=diff;animate()}
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
  // No unsolicited rotation: let visitors inspect artwork without losing their place.
  const visibility=new IntersectionObserver(entries=>{paused=!entries[0]?.isIntersecting},{threshold:.05});visibility.observe(viewport);
}
