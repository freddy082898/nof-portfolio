// NOF photo preparation: brightens near-white connected background pixels only.
// This is not AI segmentation; works best for photos shot against a pale wall.
export async function prepareWhiteBackground(file, tolerance=45){
  const bitmap=await createImageBitmap(file);
  const max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const w=canvas.width,h=canvas.height,im=ctx.getImageData(0,0,w,h),d=im.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
  const eligible=i=>{const k=i*4,r=d[k],g=d[k+1],b=d[k+2],min=Math.min(r,g,b),max=Math.max(r,g,b);return min>=255-tolerance && max-min<Math.min(45,tolerance)};
  const add=i=>{if(!seen[i]&&eligible(i)){seen[i]=1;queue[tail++]=i}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
  while(head<tail){const i=queue[head++],k=i*4;d[k]=d[k+1]=d[k+2]=255;const x=i%w;if(x>0)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<(h-1)*w)add(i+w)}
  ctx.putImageData(im,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
  if(!blob)throw Error('Impossible de préparer la photo');
  return new File([blob],file.name.replace(/\.[^.]+$/,'')+'-nof.jpg',{type:'image/jpeg'});
}