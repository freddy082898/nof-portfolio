// Four-corner perspective correction for a rectangular artwork.
// Input points: top-left, top-right, bottom-right, bottom-left, normalized to image dimensions.
export async function rectifyArtwork(file,points){
 if(points.length!==4)throw Error('Sélectionne les quatre coins du tableau.');
 const bitmap=await createImageBitmap(file);
 try{
  const p=points.map(([x,y])=>[x*bitmap.width,y*bitmap.height]);
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const width=Math.max(1,Math.round((dist(p[0],p[1])+dist(p[3],p[2]))/2));
  const height=Math.max(1,Math.round((dist(p[0],p[3])+dist(p[1],p[2]))/2));
  const scale=Math.min(1,1600/Math.max(width,height));
  const W=Math.max(2,Math.round(width*scale)),H=Math.max(2,Math.round(height*scale));
  const source=document.createElement('canvas');source.width=bitmap.width;source.height=bitmap.height;
  const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
  const src=ctx.getImageData(0,0,bitmap.width,bitmap.height);
  const output=document.createElement('canvas');output.width=W;output.height=H;
  const dest=output.getContext('2d');const result=dest.createImageData(W,H);
  // Inverse projective transform, maps a rectangular pixel grid onto the four source corners.
  const [a,b,c,d]=p;
  const dx1=b[0]-c[0],dx2=d[0]-c[0],dx3=a[0]-b[0]+c[0]-d[0];
  const dy1=b[1]-c[1],dy2=d[1]-c[1],dy3=a[1]-b[1]+c[1]-d[1];
  const det=dx1*dy2-dx2*dy1;
  let g=0,h=0;
  if(Math.abs(det)>1e-8){g=(dx3*dy2-dx2*dy3)/det;h=(dx1*dy3-dx3*dy1)/det}
  const A=b[0]-a[0]+g*b[0],B=d[0]-a[0]+h*d[0],C=a[0];
  const D=b[1]-a[1]+g*b[1],E=d[1]-a[1]+h*d[1],F=a[1];
  const sw=bitmap.width,sh=bitmap.height,s=src.data,t=result.data;
  for(let y=0;y<H;y++){const v=(y+.5)/H;for(let x=0;x<W;x++){
   const u=(x+.5)/W,den=g*u+h*v+1,sx=(A*u+B*v+C)/den,sy=(D*u+E*v+F)/den;
   const ix=Math.max(0,Math.min(sw-1,Math.floor(sx))),iy=Math.max(0,Math.min(sh-1,Math.floor(sy)));
   const i=(iy*sw+ix)*4,j=(y*W+x)*4;t[j]=s[i];t[j+1]=s[i+1];t[j+2]=s[i+2];t[j+3]=255;
  }}
  dest.putImageData(result,0,0);
  const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.94));
  if(!blob)throw Error('Impossible de créer la photo redressée.');
  return new File([blob],'nof-tableau-detoure.jpg',{type:'image/jpeg'});
 }finally{bitmap.close()}
}
