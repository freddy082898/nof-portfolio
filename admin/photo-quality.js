// Local, non-destructive photographic quality diagnostics for NOF Studio.
export async function inspectPhoto(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Fichier image requis');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const width=img.naturalWidth,height=img.naturalHeight;
  const canvas=document.createElement('canvas');const scale=Math.min(1,420/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let brightness=0,clippedLight=0,clippedDark=0,edges=0,edgeCount=0;
  const gray=new Float32Array(canvas.width*canvas.height);
  for(let i=0,j=0;i<data.length;i+=4,j++){const r=data[i],g=data[i+1],b=data[i+2];const l=.2126*r+.7152*g+.0722*b;gray[j]=l;brightness+=l;if(r>249&&g>249&&b>249)clippedLight++;if(r<8&&g<8&&b<8)clippedDark++}
  const w=canvas.width,h=canvas.height;
  for(let y=1;y<h-1;y+=2)for(let x=1;x<w-1;x+=2){const i=y*w+x;const lap=Math.abs(4*gray[i]-gray[i-1]-gray[i+1]-gray[i-w]-gray[i+w]);edges+=lap;edgeCount++}
  const n=w*h,mean=brightness/n,detail=edges/Math.max(1,edgeCount),issues=[];
  if(Math.min(width,height)<1200)issues.push('Résolution limitée : une photo d’au moins 1 200 px sur le petit côté est préférable pour le zoom.');
  if(mean<65)issues.push('Photo globalement sombre : privilégie une lumière diffuse et uniforme.');
  if(mean>228)issues.push('Photo très claire : vérifie que les couleurs de la toile ne sont pas délavées.');
  if(clippedLight/n>.22)issues.push('Beaucoup de zones blanches : vérifie les reflets et la surexposition (un fond blanc peut aussi expliquer ce résultat).');
  if(clippedDark/n>.20)issues.push('Beaucoup de zones noires : vérifie la conservation des détails sombres.');
  if(detail<5)issues.push('Peu de détails fins détectés : vérifie la netteté à 100 % (ce test peut être trompé par une peinture minimaliste).');
  return {width,height,megapixels:width*height/1e6,mean,detail,issues};
 }finally{URL.revokeObjectURL(url)}
}
