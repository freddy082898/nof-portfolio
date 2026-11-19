// Local OpenCV contour detector. No image is sent to a remote API.
let cvPromise;
function opencv(){
 if(cvPromise)return cvPromise;
 cvPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://docs.opencv.org/4.10.0/opencv.js';
  script.async=true;
  const timer=setTimeout(()=>reject(new Error('Chargement de la détection trop long')),30000);
  script.onload=async()=>{try{let cv=window.cv;if(cv instanceof Promise)cv=await cv;if(cv?.Mat){clearTimeout(timer);resolve(cv)}else if(cv){cv.onRuntimeInitialized=()=>{clearTimeout(timer);resolve(cv)}}else throw Error('OpenCV non disponible')}catch(e){clearTimeout(timer);reject(e)}};
  script.onerror=()=>{clearTimeout(timer);reject(new Error('Détection automatique indisponible hors connexion'))};
  document.head.append(script);
 }).catch(e=>{cvPromise=null;throw e});
 return cvPromise;
}
export async function detectArtworkCorners(image){
 const cv=await opencv();
 const max=1000,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 const mats=[];const keep=m=>{mats.push(m);return m};
 try{
  const src=keep(cv.imread(canvas)),gray=keep(new cv.Mat()),blur=keep(new cv.Mat()),edges=keep(new cv.Mat());
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);cv.Canny(blur,edges,45,130);
  const contours=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
  const area=canvas.width*canvas.height;let best=null,bestScore=0;
  for(let i=0;i<contours.size();i++){
   const c=contours.get(i);try{
    const perimeter=cv.arcLength(c,true),polygon=new cv.Mat();
    try{
     cv.approxPolyDP(c,polygon,.025*perimeter,true);
     if(polygon.rows!==4||!cv.isContourConvex(polygon))continue;
     const size=Math.abs(cv.contourArea(polygon)),fraction=size/area;
     if(fraction<.06||fraction>.96)continue;
     const pts=[];for(let j=0;j<4;j++)pts.push([polygon.data32S[j*2],polygon.data32S[j*2+1]]);
     const center=[pts.reduce((s,p)=>s+p[0],0)/4,pts.reduce((s,p)=>s+p[1],0)/4];
     const ordered=pts.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
     const start=ordered.reduce((best,p,i)=>p[0]+p[1]<ordered[best][0]+ordered[best][1]?i:best,0);
     const result=[...ordered.slice(start),...ordered.slice(0,start)];
     // Ensure TL,TR,BR,BL winding, regardless of contour traversal.
     if(result[1][0]<result[3][0]){result.splice(1,3,...result.slice(1).reverse())}
     const score=fraction*(1-Math.abs(center[0]/canvas.width-.5)*.3-Math.abs(center[1]/canvas.height-.5)*.3);
     if(score>bestScore){bestScore=score;best=result.map(([x,y])=>[x/canvas.width,y/canvas.height])}
    }finally{polygon.delete()}
   }finally{c.delete()}
  }
  if(!best)throw Error('Aucun contour rectangulaire fiable détecté. Place les coins manuellement.');
  return best;
 }finally{mats.reverse().forEach(m=>m.delete())}
}
