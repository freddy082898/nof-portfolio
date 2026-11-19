// Lightweight offline edge detector. No OpenCV, WASM or external downloads.
export function detectCornersFromPixels(data,w,h){
 if(w<32||h<32)throw Error('Image trop petite');
 const gray=new Float32Array(w*h);
 for(let i=0;i<w*h;i++){const j=i*4;gray[i]=.2126*data[j]+.7152*data[j+1]+.0722*data[j+2]}
 const vertical=new Float32Array(w),horizontal=new Float32Array(h);
 for(let y=3;y<h-3;y+=2)for(let x=3;x<w-3;x+=2){
  vertical[x]+=Math.abs(gray[y*w+x+2]-gray[y*w+x-2]);
  horizontal[y]+=Math.abs(gray[(y+2)*w+x]-gray[(y-2)*w+x]);
 }
 function smooth(scores){const s=new Float32Array(scores.length);for(let i=3;i<s.length-3;i++){let v=0;for(let j=-3;j<=3;j++)v+=scores[i+j];s[i]=v/7}return s}
 function pair(scores,n){const lo=Math.round(n*.04),hi=Math.round(n*.96);let best=null,score=-Infinity;
  for(let a=lo;a<Math.round(n*.58);a+=2)for(let b=Math.max(a+Math.round(n*.22),Math.round(n*.42));b<=hi;b+=2){
   const val=(scores[a]+scores[b])*(.65+.35*(b-a)/n);
   if(val>score){score=val;best=[a,b]}
  }return best}
 const vx=smooth(vertical),hy=smooth(horizontal),[l,r]=pair(vx,w),[t,b]=pair(hy,h);
 const strength=vx[l]+vx[r]+hy[t]+hy[b];
 const avg=vertical.reduce((a,b)=>a+b,0)/w+horizontal.reduce((a,b)=>a+b,0)/h;
 if(!Number.isFinite(strength)||strength<avg*1.25)throw Error('Contours peu visibles : place les quatre coins manuellement.');
 return [[l/w,t/h],[r/w,t/h],[r/w,b/h],[l/w,b/h]];
}
export async function detectArtworkCorners(image){
 const scale=Math.min(1,480/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(32,Math.round(image.naturalWidth*scale));canvas.height=Math.max(32,Math.round(image.naturalHeight*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Traitement image indisponible');
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 return detectCornersFromPixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
}