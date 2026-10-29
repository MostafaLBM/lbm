// Port of vapor_compression_model.m and vc_input_state.m.
// Cycle units: kPa, °C, kJ/kg, kJ/(kg K), kW, kg/s.
export function createModel(C,fluids){
 const cache=new Map(),assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 function prop(out,a,x,b,y,fluid){
  const key=[out,a,x,b,y,fluid].join('|');
  if(cache.has(key))return cache.get(key);
  const r=C.PropsSI(out,a,x,b,y,fluid);
  assert(Number.isFinite(r)&&Math.abs(r)<1e100,`Cannot resolve ${out} for ${fluid} at these settings. Adjust the temperature lift, superheat or subcooling.`);
  if(cache.size>16000)cache.clear();cache.set(key,r);return r;
 }
 const get=fluid=>{const r=fluids.find(f=>f.name===fluid);assert(r,'Select a supported refrigerant.');return r;};
 const satP=(fluid,t,q)=>prop('P','T',t+273.15,'Q',q,fluid)/1000;
 const satT=(fluid,p,q)=>prop('T','P',p*1000,'Q',q,fluid)-273.15;
 function inputState(fluid,mode,a,b){
  const f=get(fluid),lo=Math.max(-60,f.Tmin+1),hi=Math.min(80,f.Tcrit-1),ehi=Math.min(20,hi-3);
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  assert(Number.isFinite(a)&&Number.isFinite(b),'Please enter finite numeric values.');
  let Te,Tc,limits,values;
  if(mode==='temperature'){
   Te=clamp(a,lo,ehi);Tc=clamp(b,Te+3,hi);limits=[[lo,ehi],[Te+3,hi]];values=[Te,Tc];
  }else{
   const emin=satP(fluid,lo,1),emax=satP(fluid,ehi,1),pe=clamp(a,emin,emax);
   Te=satT(fluid,pe,1);
   const cmin=satP(fluid,Te+3,0),cmax=satP(fluid,hi,0),pc=clamp(b,cmin,cmax);
   Tc=satT(fluid,pc,0);limits=[[emin,emax],[cmin,cmax]];values=[pe,pc];
  }
  return {Te,Tc,limits,values,mode};
 }
 function state(fluid,p,h){
  const T=prop('T','P',p*1000,'H',h*1000,fluid)-273.15,s=prop('S','P',p*1000,'H',h*1000,fluid)/1000;
  const x=prop('Q','P',p*1000,'H',h*1000,fluid);
  return {T,p,h,s,x:x>=0&&x<=1?x:null};
 }
 function solve(o){
  const {fluid,Te,Tc,superheat,subcool,eta,Qload}=o,f=get(fluid);
  assert([Te,Tc,superheat,subcool,eta,Qload].every(Number.isFinite),'Please enter finite numeric values.');
  assert(Tc>Te&&superheat>=0&&subcool>=0&&eta>0&&eta<=1&&Qload>0,'Condenser temperature must exceed evaporator temperature; efficiencies and load must be positive.');
  assert(Tc<f.Tcrit&&Te>f.Tmin,'This app models subcritical refrigeration. Keep the condenser below the critical temperature.');
  assert(Te+superheat<f.Tmax&&Tc-subcool>f.Tmin,'Superheat or subcooling exceeds the refrigerant property limits.');
  const pe=satP(fluid,Te,1),pc=satP(fluid,Tc,0);assert(pc>pe,'Condenser pressure must exceed evaporator pressure.');
  const h1=superheat<1e-9?prop('H','P',pe*1000,'Q',1,fluid)/1000:prop('H','P',pe*1000,'T',Te+superheat+273.15,fluid)/1000;
  const s1=superheat<1e-9?prop('S','P',pe*1000,'Q',1,fluid)/1000:prop('S','P',pe*1000,'T',Te+superheat+273.15,fluid)/1000;
  const h2s=prop('H','P',pc*1000,'S',s1*1000,fluid)/1000,h2=h1+(h2s-h1)/eta;
  const h3=subcool<1e-9?prop('H','P',pc*1000,'Q',0,fluid)/1000:prop('H','P',pc*1000,'T',Tc-subcool+273.15,fluid)/1000;
  const p=[pe,pc,pc,pe],h=[h1,h2,h3,h3],names=['Compressor suction','Compressor discharge','Condenser outlet','Expansion-valve outlet'];
  const states=p.map((p,i)=>({id:i+1,name:names[i],...state(fluid,p,h[i])}));
  if(superheat<1e-9){states[0].T=Te;states[0].x=1;}
  if(subcool<1e-9){states[2].T=Tc;states[2].x=0;}
  const hfE=prop('H','P',pe*1000,'Q',0,fluid)/1000,hgE=prop('H','P',pe*1000,'Q',1,fluid)/1000,hfC=prop('H','P',pc*1000,'Q',0,fluid)/1000,hgC=prop('H','P',pc*1000,'Q',1,fluid)/1000;
  states.forEach(q=>{q.phase=q.x!==null?`x = ${q.x.toFixed(4)}`:q.h<(q.p===pe?hfE:hfC)?'Subcooled liquid':q.h>(q.p===pe?hgE:hgC)?'Superheated vapor':'Single phase';});
  const qL=h1-h3,w=h2-h1,qH=h2-h3;assert(qL>0&&w>0&&qH>0,'No refrigeration at these settings. Adjust the temperature lift, superheat or subcooling.');
  assert(h1>=hgE-0.00001,'Compressor inlet must be dry vapor.');assert(h3<=hfC+0.00001,'Condenser outlet must be liquid.');
  const mdot=Qload/qL,power=mdot*w,Qreject=mdot*qH;
  const c={...o,label:f.label,blend:f.blend,states,p,h,T:states.map(q=>q.T),s:states.map(q=>q.s),x:states.map(q=>q.x),phase:states.map(q=>q.phase),h2s,qL,w,qH,COP:qL/w,COPheating:qH/w,mdot,power,Qreject,pressureRatio:pc/pe,QloadBtu:Qload*3600000/1055.05585262,volumeFlow:mdot/prop('D','P',pe*1000,'H',h1*1000,fluid),balance:qH-qL-w,Tcrit:f.Tcrit,evaporatorBubble:satT(fluid,pe,0),evaporatorDew:satT(fluid,pe,1),condenserBubble:satT(fluid,pc,0),condenserDew:satT(fluid,pc,1),hfE,sfE:prop('S','P',pe*1000,'Q',0,fluid)/1000};
  assert(Math.abs(c.balance)<1e-7&&Math.abs(Qreject-Qload-power)<1e-7,'Cycle energy balance failed.');return c;
 }
 function curves(c,n=20){
  const paths=[],ideal=[];
  for(let k=0;k<4;k++){
   const j=(k+1)%4,points=[];
   for(let i=0;i<=n;i++){
    const t=i/n,p=k===0||k===2?Math.exp(Math.log(c.p[k])+t*Math.log(c.p[j]/c.p[k])):c.p[k];
    let h=c.h[k]+t*(c.h[j]-c.h[k]);
    if(k===0){const hs=prop('H','P',p*1000,'S',c.s[0]*1000,c.fluid)/1000;h=c.h[0]+(hs-c.h[0])/c.eta;ideal.push({p,h:hs,T:prop('T','P',p*1000,'H',hs*1000,c.fluid)-273.15,s:c.s[0]});}
    const q={p,h,T:prop('T','P',p*1000,'H',h*1000,c.fluid)-273.15,s:prop('S','P',p*1000,'H',h*1000,c.fluid)/1000};points.push(q);
   }
   paths.push(points);
  }
  return {paths,ideal};
 }
 return {solve,curves,inputState,satP,satT,get};
}
