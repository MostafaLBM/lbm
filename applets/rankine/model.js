/* Browser port of the supplied Rankine MATLAB models. Pressures: kPa; T: °C;
   h and energy: kJ/kg; s: kJ/(kg K). All mass fractions per kg boiler steam. */
(function(root){
'use strict';
const F=root.IF97 || require('./vendor/if97.js');
const assert=(test,msg)=>{if(!test)throw new Error(msg);};
const CRITICAL_P=22064,CRITICAL_T=373.946;
const satCache=new Map();
function region3(P,t,guess){
  if(Math.abs(P-22.064)<1e-10&&Math.abs(t-647.096)<1e-10)return F.r3(P,t,322);
  let rho=guess??F.r3(P,t).rho,r,best,bestResidual=Infinity;
  // Refine the backward-volume estimate against the fundamental Helmholtz
  // pressure equation. This removes volume-fit jumps near criticality.
  for(let k=0;k<70;k++){
    r=F.r3(P,t,rho);const residual=r.p-P;
    if(Math.abs(residual)<bestResidual){best=r;bestResidual=Math.abs(residual);}
    if(Math.abs(residual)<5e-13)break;
    const derivative=r.dpdrho;
    if(!Number.isFinite(derivative)||derivative<=0)break;
    let step=Math.max(-rho*.04,Math.min(rho*.04,residual/derivative));
    let next=rho-step;
    for(let j=0;j<12;j++){
      const trial=F.r3(P,t,next);
      if(Number.isFinite(trial.p)&&Math.abs(trial.p-P)<Math.abs(residual))break;
      step/=2;next=rho-step;
    }
    if(next===rho)break;rho=next;
  }
  if(bestResidual>5e-12){
    // Select a stable branch before bisection. A subcritical isotherm has
    // three density roots; an unconstrained search can choose a spinodal.
    let low=1,high=800;
    if(t<647.096){
      const liquid=guess!==undefined?guess>=322:P>=F.r4_T_Psat(t);
      let lo=liquid?322:1,hi=liquid?800:322;
      for(let k=0;k<55;k++){
        const mid=(lo+hi)/2,d=F.r3(P,t,mid).dpdrho;
        if(liquid?d<0:d>0)lo=mid;else hi=mid;
      }
      if(liquid)low=(lo+hi)/2;else high=(lo+hi)/2;
    }
    for(let k=0;k<80;k++){
      const mid=(low+high)/2,trial=F.r3(P,t,mid),residual=trial.p-P;
      if(Math.abs(residual)<bestResidual){best=trial;bestResidual=Math.abs(residual);}
      if(residual>0)high=mid;else low=mid;
      if(high-low<1e-11)break;
    }
  }
  assert(best&&bestResidual<1e-7,'Dense-fluid properties could not be resolved at these conditions.');
  return best;
}
function forward(P,t,phase=null){
  if(t>623.15&&P>F.b23_T_P(t))return region3(P,t,phase==='liquid'?500:phase==='vapor'?100:undefined);
  if(t<=623.15&&phase)return phase==='liquid'?F.r1(P,t):F.r2(P,t);
  return F.solve(P,t);
}
function saturation(p){
  if(satCache.has(p))return satCache.get(p);
  assert(p>=0.612 && p<CRITICAL_P,'Saturation properties exist only below the critical pressure (22.064 MPa).');
  const P=p/1000;let t=F.r4_P_Tsat(P),liquid,vapor;
  if(P>22.06){
    // The region-4 pressure fit and the Helmholtz pressure equation differ
    // slightly at the tip. Seed coexistence on the critical isochore, then
    // match the two stable branches' Gibbs energies at the requested p.
    for(let k=0;k<12;k++){
      const r=F.r3(P,t,322),d=(F.r3(P,t+0.0001,322).p-F.r3(P,t-0.0001,322).p)/0.0002;
      const next=t-(r.p-P)/d;if(Math.abs(next-t)<1e-12)break;t=next;
    }
    for(let k=0;k<8;k++){
      liquid=region3(P,t,500);vapor=region3(P,t,100);
      const dg=(liquid.h-t*liquid.s)-(vapor.h-t*vapor.s);
      if(Math.abs(dg)<1e-9||vapor.s-liquid.s<1e-7)break;
      const dt=dg/(vapor.s-liquid.s);if(Math.abs(dt)>0.00001)break;t-=dt;
    }
    liquid=region3(P,t,500);vapor=region3(P,t,100);
  }else{
    liquid=P<=16.5291642526?F.r1(P,t):region3(P,t,F.r3(P,t-0.00001).rho);
    vapor=P<=16.5291642526?F.r2(P,t):region3(P,t,F.r3(P,t+0.00001).rho);
  }
  const r={p,T:t-273.15,t,liquid,vapor};
  if(satCache.size>5000)satCache.clear();satCache.set(p,r);return r;
}
function boilerMinimumTemperature(p){return p<CRITICAL_P?saturation(p).T:374;}
function statePT(p,T){
  const r=forward(p/1000,T+273.15);
  return {p,T,h:r.h,s:r.s,v:r.v};
}
function inverse(p,value,key){
  assert(Number.isFinite(value)&&p>=0.612&&p<=30000,'The requested state is outside the app’s pressure range.');
  let low=273.15,high=1073.15,phase=null;
  // Above critical pressure there is one continuous fluid branch, with no
  // saturation temperature, latent heat or vapor-quality interpolation.
  if(p<CRITICAL_P){
    const a=saturation(p),f=a.liquid[key],g=a.vapor[key];
    if(value>=f-1e-9 && value<=g+1e-9){
      const x=Math.max(0,Math.min(1,(value-f)/(g-f)));
      return {p,T:a.T,h:a.liquid.h+x*(a.vapor.h-a.liquid.h),s:a.liquid.s+x*(a.vapor.s-a.liquid.s),v:a.liquid.v+x*(a.vapor.v-a.liquid.v),x};
    }
    phase=value<f?'liquid':'vapor';
    low=value<f?273.15:a.t;high=value<f?a.t:1073.15;
  }
  let r;
  // Invert the forward EOS, explicitly treating the two-phase region above.
  // Safeguarded Newton keeps the forward h/s internally consistent.
  let t=(low+high)/2;
  for(let i=0;i<90;i++){
    r=forward(p/1000,t,phase);
    const delta=r[key]-value;
    if(Math.abs(delta)<(key==='h'?1e-7:1e-10))break;
    if(delta>0)high=t;else low=t;
    let next=t-delta/(key==='h'?r.cp:r.cp/t);
    // Near the critical point, very large cp can make Newton steps stall
    // against a bracket endpoint. Require a meaningful bracket contraction.
    const margin=(high-low)*0.12;
    if(!Number.isFinite(next)||next<=low+margin||next>=high-margin)next=(low+high)/2;
    if(next===t)break;t=next;
  }
  assert(r && Number.isFinite(r.h)&&Number.isFinite(r.s),'Steam properties could not be resolved.');
  assert(Math.abs(r[key]-value)<(key==='h'?0.02:0.00004),'The requested state lies outside the supported property range.');
  return {p,T:r.t-273.15,h:key==='h'?value:r.h,s:key==='s'?value:r.s,v:r.v};
}
const ph=(p,h)=>inverse(p,h,'h'),ps=(p,s)=>inverse(p,s,'s');
function pump(p1,h,p2,eta){return h+(ps(p2,ph(p1,h).s).h-h)/eta;}
const defaults={pc:10,pb:8000,Tmax:480,ep:1,et:1,reheat:false,pr:2000,open:false,closed:false,po:200,px:800,drain:'pump'};
function solve(options={}){
  const v={...defaults,...options}, {pc,pb,Tmax,ep,et,reheat:rh,pr,open:of,closed:cf,po,px}=v;
  assert([pc,pb,Tmax,ep,et,pr,po,px].every(Number.isFinite),'Please enter finite numeric values.');
  assert(pc>=5&&pc<=100&&pb>=500&&pb<=30000,'Condenser pressure must be 5–100 kPa; boiler pressure 0.5–30 MPa.');
  assert(ep>=0.5&&ep<=1&&et>=0.5&&et<=1,'Isentropic efficiencies must be between 0.5 and 1.');
  const highPressure=pb>=CRITICAL_P,supercritical=pb>CRITICAL_P,tmin=boilerMinimumTemperature(pb);
  assert(Tmax<=650&&Tmax>=tmin-1e-6,highPressure?'At or above critical boiler pressure, select 374–650 °C.':'Maximum temperature must be at least the boiler saturation temperature, and at most 650 °C.');
  if(rh)assert(pr>pc&&pr<pb,'Reheat pressure must lie between condenser and boiler pressures.');
  const upper=rh?pr:pb;
  if(of)assert(po>pc&&po<upper,'Open heater pressure must lie between condenser and final turbine inlet pressures.');
  if(cf)assert(px>pc&&px<upper,'Closed heater pressure must lie between condenser and final turbine inlet pressures.');
  if(of)assert(po<CRITICAL_P,'The open heater needs a subcritical pressure to provide saturated liquid.');
  if(cf)assert(px<CRITICAL_P,'The closed heater needs a subcritical extraction pressure to condense its steam.');
  if(of&&cf)assert(px>po,'Closed heater extraction pressure must exceed the open heater pressure.');
  const a=saturation(pc),b=highPressure?null:saturation(pb);
  const h1=a.liquid.h,s1=a.liquid.s;
  const h2=h1+(ps(pb,s1).h-h1)/ep;
  const inlet=b&&Math.abs(Tmax-b.T)<1e-6?{h:b.vapor.h,s:b.vapor.s}:statePT(pb,Tmax);
  const h3=inlet.h,s3=inlet.s,pe=rh?pr:pc,h4=h3-et*(h3-ps(pe,s3).h);
  const c={p:[pc,pb,pb,pe],h:[h1,h2,h3,h4],T:[a.T,ph(pb,h2).T,Tmax,ph(pe,h4).T],s:[s1,ph(pb,h2).s,s3,ph(pe,h4).s],qboiler:h3-h2,qreheat:0,wtHP:h3-h4,wtLP:0,reheat:rh,supercritical,critical:pb===CRITICAL_P,openFWH:of,closedFWH:cf,yopen:0,yclosed:0,massCondenser:1,drainPump:v.drain==='pump'};
  if(rh){
    const i=statePT(pr,Tmax),h6=i.h-et*(i.h-ps(pc,i.s).h),e=ph(pc,h6);
    c.p.push(pr,pc);c.h.push(i.h,h6);c.T.push(Tmax,e.T);c.s.push(i.s,e.s);
    c.qreheat=i.h-h4;c.wtLP=i.h-h6;
  }
  const hout=c.h.at(-1),x=(hout-a.liquid.h)/(a.vapor.h-a.liquid.h);
  c.xout=x>=0&&x<=1+1e-8?Math.max(0,Math.min(1,x)):null;
  c.quality=c.xout===null?(x>1?'Superheated vapor':'Compressed liquid'):'Two-phase mixture';
  c.wp=h2-h1;c.wt=c.wtHP+c.wtLP;c.qin=c.qboiler+c.qreheat;c.qout=hout-h1;
  c.paths=[];
  const add=(p,h,kind,name,ref=null)=>c.paths.push({p,h,kind,name,ref});
  if(of||cf){
    const pin=rh?pr:pb,hin=rh?c.h[4]:h3,sin=rh?c.s[4]:s3;
    const ex=p=>hin-et*(hin-ps(p,sin).h);
    let hfo=NaN,hp,hcond,yc=0,yo=0,hd,hec,hclosed,hdp,heo;
    if(of){hcond=pump(pc,h1,po,ep);hfo=saturation(po).liquid.h;hp=pump(po,hfo,pb,ep);heo=ex(po);}
    else{hcond=pump(pc,h1,pb,ep);hp=hcond;}
    let hf=hp;
    const drainPump=v.drain==='auto'?!of:v.drain==='pump';c.drainPump=drainPump;
    if(cf){
      hd=saturation(px).liquid.h;hec=ex(px);hf=statePT(pb,saturation(px).T).h;
      assert(hf>hp,'The closed heater cannot heat feedwater at these pressures. Increase its extraction pressure.');
      hclosed=hf;
      yc=(hf-hp)/(hec-hd+(drainPump?hf-hp:0));
      if(drainPump){hdp=pump(px,hd,pb,ep);hf=(1-yc)*hclosed+yc*hdp;}
    }
    if(of){
      yo=cf&&!drainPump?(hfo-hcond-yc*(hd-hcond))/(heo-hcond):cf?(1-yc)*(hfo-hcond)/(heo-hcond):(hfo-hcond)/(heo-hcond);
    }
    assert(yo>=0&&yc>=0&&yo+yc<1,'These heater settings require invalid extraction fractions. Adjust the heater pressures.');
    const mcond=1-yo-yc;
    if(of)c.wp=cf&&drainPump?mcond*(hcond-h1)+(1-yc)*(hp-hfo)+yc*(hdp-hd):mcond*(hcond-h1)+(hp-hfo);
    else c.wp=drainPump?mcond*(hp-h1)+yc*(hdp-hd):hp-h1;
    const bleeds=[];if(cf)bleeds.push({p:px,y:yc});if(of)bleeds.push({p:po,y:yo});bleeds.sort((a,b)=>b.p-a.p);
    const pp=[pin,...bleeds.map(b=>b.p),pc],hh=pp.map(ex);hh[0]=hin;
    let mass=1,wt=0;
    for(let k=0;k<pp.length-1;k++){wt+=mass*(hh[k]-hh[k+1]);if(k<bleeds.length)mass-=bleeds[k].y;}
    c.wtHP=rh?c.wtHP:0;c.wtLP=wt;c.wt=c.wtHP+wt;c.qboiler=h3-hf;c.qin=c.qboiler+c.qreheat;
    c.qout=mcond*(hout-h1)+(cf&&!of&&!drainPump?yc*(hd-h1):0);
    c.yopen=yo;c.yclosed=yc;c.massCondenser=mcond;c.po=po;c.pclosed=px;
    add([pc,of?po:pb],[h1,hcond],'pump','Condensate pump');
    if(of){add([po,po],[hcond,hfo],'mix','Open FWH (mixing)');add([po,pb],[hfo,hp],'pump','Boiler feed pump');}
    if(cf)add([pb,pb],[hp,hclosed],'heat','Closed FWH');
    if(cf&&drainPump)add([pb,pb],[hclosed,hf],'mix','Drain mixing chamber');
    add([pb,pb],[hf,h3],'heat','Boiler');
    if(rh){add([pb,pr],[h3,h4],'turbine','HP turbine',[pb,h3,s3]);add([pr,pr],[h4,c.h[4]],'heat','Reheater');}
    for(let k=0;k<pp.length-1;k++)add(pp.slice(k,k+2),hh.slice(k,k+2),'turbine','Turbine',[pin,hin,sin]);
    add([pc,pc],[hout,h1],'cool','Condenser');
    if(cf){
      add([px,px],[hec,hd],'bleed','Closed bleed condensation');
      if(!drainPump)add([px,of?po:pc],[hd,hd],'drain','Closed drain throttle');
      else{add([px,pb],[hd,hdp],'pump','Drain pump');add([pb,pb],[hdp,hf],'mix','Pumped drain mixing');}
    }
    if(of)add([po,po],[heo,hfo],'bleed','Open bleed / mixing');
  }else{
    add([pc,pb],[h1,h2],'pump','Pump',[pc,h1,s1]);
    add([pb,pb],[h2,h3],'heat','Boiler');
    add([pb,pe],[h3,h4],'turbine',rh?'HP turbine':'Turbine',[pb,h3,s3]);
    if(rh){add([pr,pr],[h4,c.h[4]],'heat','Reheater');add([pr,pc],[c.h[4],hout],'turbine','LP turbine',[pr,c.h[4],c.s[4]]);}
    add([pc,pc],[hout,h1],'cool','Condenser');
  }
  c.wnet=c.wt-c.wp;c.eta=c.wnet/c.qin;c.balance=c.qin-c.qout-c.wnet;
  assert(c.qin>0&&c.eta>0&&c.eta<1&&Math.abs(c.balance)<1e-6,'Cycle energy balance or operating conditions are invalid.');
  c.states=states(c);c.options=v;return c;
}
function states(c){
  const pts=[],add=(key,name,p,h)=>pts.push({id:pts.length+1,key,name,...ph(p,h)});
  const path=name=>c.paths.find(e=>e.name===name),regen=c.openFWH||c.closedFWH;
  add('condenserOut','Condenser outlet',c.p[0],c.h[0]);
  const first=path(regen?'Condensate pump':'Pump');add('pump1Out',regen?'Pump 1 outlet':'Pump outlet',first.p[1],first.h[1]);
  add('boilerOut','Boiler / turbine inlet',c.p[2],c.h[2]);
  if(c.reheat){add('hpOut','HP turbine outlet',c.p[3],c.h[3]);add('reheatOut','Reheater / LP inlet',c.p[4],c.h[4]);}
  add('turbineOut',c.reheat?'LP turbine outlet':'Turbine outlet',c.p.at(-1),c.h.at(-1));
  const end=(key,name,e,index=1)=>add(key,name,e.p[index],e.h[index]);
  if(regen){
    if(c.openFWH){end('openOut','Open FWH outlet',path('Open FWH (mixing)'));end('pump2Out','Pump 2 outlet',path('Boiler feed pump'));}
    if(c.closedFWH){end('closedOut','Closed FWH feed outlet',path('Closed FWH'));end('closedBleed','Closed FWH extraction',path('Closed bleed condensation'),0);}
    if(c.openFWH)end('openBleed','Open FWH extraction',path('Open bleed / mixing'),0);
    if(c.closedFWH){
      if(!c.drainPump){const e=path('Closed drain throttle');end('drainOut','Closed FWH drain',e,0);end('valveOut','Drain after throttle',e);}
      else{const e=path('Drain pump');end('drainOut','Closed FWH drain',e,0);end('drainPumpOut','Drain pump outlet',e);end('mixerOut','Mixing chamber outlet',path('Drain mixing chamber'));}
    }
    let order;
    if(c.openFWH&&!c.closedFWH)order=['condenserOut','pump1Out','openOut','pump2Out','boilerOut','openBleed','turbineOut'];
    else if(c.closedFWH&&!c.openFWH&&c.drainPump)order=['condenserOut','pump1Out','drainOut','drainPumpOut','mixerOut','boilerOut','closedBleed','turbineOut','closedOut'];
    else if(c.closedFWH&&!c.openFWH)order=['condenserOut','pump1Out','closedOut','boilerOut','closedBleed','turbineOut','drainOut','valveOut'];
    else if(c.drainPump)order=['condenserOut','pump1Out','openOut','pump2Out','closedOut','mixerOut','boilerOut','closedBleed','openBleed','turbineOut','drainOut','drainPumpOut'];
    else order=['condenserOut','pump1Out','openOut','pump2Out','closedOut','boilerOut','closedBleed','openBleed','turbineOut','drainOut','valveOut'];
    if(c.reheat)order.push('hpOut','reheatOut');
    return order.map((key,i)=>({...pts.find(q=>q.key===key),id:i+1}));
  }
  return pts;
}
function samplePath(e,c,n=30){
  let ref=e.ref;
  if(e.kind==='pump'&&!ref)ref=[e.p[0],e.h[0],ph(e.p[0],e.h[0]).s];
  const samples=[];
  for(let k=0;k<=n;k++){
    const t=k/n,p=e.p[0]+t*(e.p[1]-e.p[0]);let h=e.h[0]+t*(e.h[1]-e.h[0]);
    if(ref){const hs=ps(p,ref[2]).h;h=e.kind==='pump'?ref[1]+(hs-ref[1])/c.options.ep:ref[1]-c.options.et*(ref[1]-hs);}
    samples.push(ph(p,h));
  }
  return samples;
}
root.Rankine={defaults,solve,saturation,statePT,ph,ps,samplePath,boilerMinimumTemperature,CRITICAL_P,CRITICAL_T};
if(typeof module!=='undefined')module.exports=root.Rankine;
})(typeof globalThis!=='undefined'?globalThis:this);

