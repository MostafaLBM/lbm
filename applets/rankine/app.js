'use strict';
const $=id=>document.getElementById(id),R=Rankine;
let options={...R.defaults},lastCycle=null,pending=0;
const specs=[
 ['pc','Condenser pressure','kPa',5,100,0.1,'base-inputs',1],
 ['pb','Boiler pressure','MPa',0.5,30,0.01,'base-inputs',1000],
 ['Tmax','Maximum temperature','°C',100,650,0.1,'base-inputs',1],
 ['ep','Pump isentropic efficiency','',0.5,1,0.01,'base-inputs',1],
 ['et','Turbine isentropic efficiency','',0.5,1,0.01,'base-inputs',1],
 ['pr','Reheat pressure','MPa',0.011,7.999,0.001,'reheat-input',1000],
 ['po','Open-heater pressure','MPa',0.011,7.998,0.001,'open-input',1000],
 ['px','Closed-heater pressure','MPa',0.012,7.999,0.001,'closed-input',1000]
];
for(const [key,label,unit,min,max,step,parent,factor] of specs){
 const box=document.createElement('div');box.className='control';box.id=`control-${key}`;
 box.innerHTML=`<div class="input-head"><label for="${key}-number">${label}</label><span class="number-wrap"><input id="${key}-number" type="number" inputmode="decimal" min="${min}" max="${max}" step="any" aria-describedby="${key}-bounds"><small>${unit}</small></span></div><input id="${key}-range" class="range" type="range" min="${min}" max="${max}" step="any" aria-label="${label}${unit?' in '+unit:''}"><div class="limits" id="${key}-bounds"><span></span><span></span></div>`;
 $(parent).append(box);
 if(key==='pb')box.insertAdjacentHTML('beforeend','<p class="hint">Critical pressure: 22.064 MPa.</p>');
 const range=$(`${key}-range`),number=$(`${key}-number`);
 range.addEventListener('input',()=>{options[key]=Number(range.value)*factor;number.value=range.value;schedule();});
 number.addEventListener('change',()=>{
  if(!Number.isFinite(number.valueAsNumber)){number.value=String(options[key]/factor);$('status').textContent='Please enter a numeric value.';return;}
  const raw=number.valueAsNumber,clamped=Math.max(Number(range.min),Math.min(Number(range.max),raw));
  options[key]=clamped*factor;schedule(raw!==clamped?'Value adjusted to the supported range.':'');
 });
 number.addEventListener('keydown',e=>{if(e.key==='Enter'){number.dispatchEvent(new Event('change'));number.blur();}});
}
for(const key of ['reheat','open','closed'])$(key).addEventListener('change',()=>{options[key]=$(key).checked;schedule();});
$('drain').addEventListener('change',()=>{options.drain=$('drain').value;schedule();});
$('reset').addEventListener('click',()=>{options={...R.defaults};update();});
function schedule(note=''){
 cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>update(note));
}
function normalize(){
 let message='';
 const tmin=R.boilerMinimumTemperature(options.pb);
 if(options.Tmax<tmin){options.Tmax=tmin;message=options.pb>=R.CRITICAL_P?`Temperature raised to ${tmin.toFixed(2)} °C to keep the boiler outlet above the critical temperature.`:`Temperature raised to ${tmin.toFixed(2)} °C: saturated vapor at the boiler pressure.`;}
 function bound(key,min,max,factor=1000){
  const a=$(`${key}-range`),b=$(`${key}-number`);
  a.min=String(min/factor);a.max=String(max/factor);b.min=a.min;b.max=a.max;
  options[key]=Math.max(min,Math.min(max,options[key]));
 }
 bound('Tmax',tmin,650,1);bound('pr',options.pc+10,options.pb-1);
 const top=Math.min(options.reheat?options.pr:options.pb,R.CRITICAL_P);
 if(options.open&&options.closed){bound('po',options.pc+1,top-3);bound('px',options.po+1,top-1);}
 else{bound('po',options.pc+1,top-1);bound('px',options.pc+1,top-1);}
 for(const [key,,unit,,,,,factor] of specs){
  const a=$(`${key}-range`),b=$(`${key}-number`);
  const value=options[key]/factor;
  a.value=String(value);
  if(document.activeElement!==b)b.value=String(Number(value.toFixed(key==='Tmax'?5:8)));
  const enabled=key==='pr'?options.reheat:key==='po'?options.open:key==='px'?options.closed:true;
  a.disabled=b.disabled=!enabled;$(`control-${key}`).classList.toggle('inactive',!enabled);
  const fmt=x=>Number(Number(x).toFixed(key==='Tmax'?2:3)).toString();
  $(`${key}-bounds`).children[0].textContent=`${fmt(a.min)} ${unit}`;
  $(`${key}-bounds`).children[1].textContent=`${fmt(a.max)} ${unit}`;
 }
 for(const key of ['reheat','open','closed'])$(key).checked=options[key];
 $('drain').disabled=!options.closed;$('drain').value=options.drain;
 return message;
}
function update(note=''){
 const adjusted=normalize();
 try{
  const c=R.solve(options);lastCycle=c;window.currentCycle=c;
  $('status').className='status';$('status').textContent=adjusted||note||(c.supercritical?'Supercritical-pressure boiler: no boiling plateau. Heater extraction pressures remain below 22.064 MPa.':c.critical?'Boiler at the critical pressure (22.064 MPa). Heater extraction pressures remain subcritical.':'All quantities use absolute pressures. Changes update the cycle immediately.');
  $('eta').textContent=(100*c.eta).toFixed(2)+'%';$('net').textContent=c.wnet.toFixed(1);
  $('quality').textContent=c.xout===null?'Superheated':(100*c.xout).toFixed(2)+'% vapor';
  const final=c.states.find(q=>q.key==='turbineOut');
  $('quality-note').textContent=c.xout===null?'Quality is undefined outside the two-phase region':`x${final.id} = ${c.xout.toFixed(4)} at the turbine outlet`;
  for(const key of ['qin','qout','wt','wp'])$(key).textContent=c[key].toFixed(key==='wp'?2:1)+' kJ/kg';
  $('yo').textContent=c.openFWH?(100*c.yopen).toFixed(2)+'%':'Off';$('yc').textContent=c.closedFWH?(100*c.yclosed).toFixed(2)+'%':'Off';
  $('mode').textContent=(c.critical?'CRITICAL PRESSURE':c.supercritical?'SUPERCRITICAL':c.openFWH||c.closedFWH?'REGENERATION':'SIMPLE')+(c.reheat?' + REHEAT':' CYCLE')+((c.supercritical||c.critical)&&(c.openFWH||c.closedFWH)?' + REGENERATION':'');
  $('states').innerHTML=c.states.map(q=>`<tr><td>${q.id}</td><td>${q.name}</td><td>${q.T.toFixed(2)}</td><td>${q.p.toFixed(3)}</td><td>${q.h.toFixed(2)}</td><td>${q.s.toFixed(4)}</td></tr>`).join('');
  drawTS(c);drawPlant(c);
 }catch(e){
  lastCycle=null;window.currentCycle=null;$('status').className='status error';$('status').textContent=e.message;
  for(const key of ['eta','net','quality','qin','qout','wt','wp','yo','yc'])$(key).textContent='—';
  $('quality-note').textContent='Adjust the settings to restore a feasible cycle.';$('states').innerHTML='';$('ts').innerHTML='';$('plant').innerHTML='';
 }
}
const colors={heat:'#c15a2c',turbine:'#7953a0',pump:'#3372a3',cool:'#128a88',bleed:'#7a8589',drain:'#7a8589',mix:'#7a8589'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function text(x,y,s,cls='',extra=''){return `<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(s)}</text>`;}
function path(points,stroke,width=2.5,dash=''){
 return `<path d="${points.map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(2)).join(' ')).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;
}
// Saturation dome is independent of cycle settings, so calculate it once.
const dome=[];
for(let i=0;i<=150;i++){
 const T=1+i*(373.94-1)/150,p=IF97.r4_T_Psat(T+273.15)*1000;
 const a=R.saturation(p);dome.push({T,sf:a.liquid.s,sg:a.vapor.s});
}
dome.push({T:373.946,sf:4.41202148223476,sg:4.41202148223476});
function drawTS(c){
 const sx=s=>64+s*66.3,sy=T=>409-T*0.51;
 let s='';
 for(let T=0;T<=700;T+=100){const y=sy(T);s+=`<line class="grid" x1="64" x2="727" y1="${y}" y2="${y}"/>`+text(52,y+4,T,'tick','text-anchor="end"');}
 for(let i=0;i<=10;i++){const x=sx(i);s+=`<line class="grid" x1="${x}" x2="${x}" y1="52" y2="409"/>`+text(x,430,i,'tick','text-anchor="middle"');}
 s+=text(395,458,'Specific entropy, s [kJ/(kg K)]','axis-label','text-anchor="middle"');
 s+=`<text class="axis-label" transform="translate(17 235) rotate(-90)" text-anchor="middle">Temperature [°C]</text>`;
 s+=path(dome.map(q=>[sx(q.sf),sy(q.T)]),'#b9c2b6',2)+path(dome.map(q=>[sx(q.sg),sy(q.T)]),'#b9c2b6',2);
 s+=text(sx(4.45),sy(370),'Saturation dome','tick','text-anchor="middle"');
 for(const e of c.paths){
  const pts=R.samplePath(e,c,36).map(q=>[sx(q.s),sy(q.T)]),aux=['bleed','drain','mix'].includes(e.kind);
  s+=path(pts,colors[e.kind],aux?1.6:2.8,e.kind==='mix'?'2 5':aux?'6 4':'');
  const k=Math.floor(pts.length*0.56),a=pts[k],b=pts[k+1];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])>0.01&&!aux){
   const ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
   s+=`<path d="M-5 -4L2 0L-5 4" fill="none" stroke="${colors[e.kind]}" stroke-width="2" transform="translate(${a}) rotate(${ang})"/>`;
  }
 }
 const used=new Set(),labels=[];
 for(const q of c.states){
  s+=`<circle cx="${sx(q.s)}" cy="${sy(q.T)}" r="3.5" fill="#fffefa" stroke="#19363d" stroke-width="1.4"><title>State ${q.id}: ${esc(q.name)}, ${q.T.toFixed(2)} °C, ${q.p.toFixed(2)} kPa</title></circle>`;
  if(used.has(q.id))continue;
  const group=c.states.filter(v=>!used.has(v.id)&&Math.abs(v.s-q.s)<0.11&&Math.abs(v.T-q.T)<8);
  group.forEach(v=>used.add(v.id));
  const label=group.map(v=>v.id).join(', '),x=Math.min(700,sx(q.s)+10);let y=sy(q.T)-12;
  while(labels.some(l=>Math.abs(l.y-y)<15&&Math.abs(l.x-x)<Math.max(30,label.length*6)))y-=17;
  if(y<20)y=sy(q.T)+23;
  labels.push({x,y});s+=text(x,y,label,'state-label');
 }
 $('ts').innerHTML=s;
}
function drawPlant(c){
 const regen=c.openFWH||c.closedFWH;
 let s='<defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#56746c"/></marker></defs>';
 const line=(pts,col='#56746c',dash='')=>{s+=path(pts,col,2.3,dash);};
 const box=(x,y,w,h,name,col)=>{s+=`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="8" fill="${col}" stroke="#78918b"/>`+text(x,y+4,name,'device-label','text-anchor="middle"');};
 const pump=(x,y,name)=>{s+=`<circle cx="${x}" cy="${y}" r="18" fill="#e0ebf6" stroke="#3372a3"/><path d="M${x+8} ${y-9}L${x-8} ${y}L${x+8} ${y+9}Z" fill="#3372a3"/>`+text(x,y-29,name,'device-label','text-anchor="middle"');};
 const turb=(x,y,name)=>{s+=`<path d="M${x-29} ${y-18}L${x+32} ${y-33}V${y+33}L${x-29} ${y+18}Z" fill="#eee3f4" stroke="#7953a0"/>`+text(x,y-45,name,'device-label','text-anchor="middle"');};
 const badge=(x,y,id,name)=>{s+=`<g><title>State ${id}: ${esc(name)}</title><circle cx="${x}" cy="${y}" r="11" class="state-badge"/>`+text(x,y,id,'badge-text')+'</g>';};
 // Main loop; feedwater travels right to left along the lower branch.
 line([[140,345],[140,90],[c.reheat?335:650,90]],colors.heat);
 line([[c.reheat?335:650,90],[795,90],[795,345]],colors.turbine);
 line([[795,345],[140,345]],colors.cool);
 box(140,190,78,76,'Boiler','#fbe7d6');turb(650,90,c.reheat?'LP turbine':'Turbine');
 if(c.reheat){turb(335,90,'HP turbine');box(480,90,84,48,'Reheater','#fbe7d6');}
 box(795,285,99,52,'Condenser','#dff1ed');pump(690,345,regen?'Pump I':'Pump');
 if(c.openFWH){box(560,345,92,45,'Open FWH','#e9efda');pump(465,345,'Pump II');}
 if(c.closedFWH)box(355,345,100,48,'Closed FWH','#e9efda');
 if(c.closedFWH&&c.drainPump)box(225,345,58,38,'Mixer','#edf0df');
 // Arrows communicate the direction without assuming any relative mass flow.
 s+=`<path d="M140 135V110M255 90H285M795 205V225M650 345H620M290 345H270" fill="none" stroke="#56746c" stroke-width="2" marker-end="url(#flow-arrow)"/>`;
 const xy={condenserOut:[752,345],pump1Out:[640,345],boilerOut:[240,90],hpOut:[395,90],reheatOut:[565,90],turbineOut:[795,170],openOut:[510,345],pump2Out:[415,345],closedOut:[290,345],mixerOut:[185,345],closedBleed:[710,155],openBleed:[740,205],drainOut:[355,400],valveOut:[480,400],drainPumpOut:[225,400]};
 if(!c.openFWH)xy.pump1Out=[560,345];
 if(c.closedFWH){
  line([[665,114],[710,114],[710,230],[355,230],[355,321]],colors.bleed,'6 4');
  line([[355,369],[355,400]],colors.bleed,'6 4');
  if(c.drainPump){line([[355,400],[225,400],[225,364]],colors.bleed,'6 4');pump(280,400,'Drain pump');}
  else{
   const dest=c.openFWH?560:795;
   line([[355,400],[dest,400],[dest,c.openFWH?368:310]],colors.bleed,'6 4');
   s+=`<path d="M438 393L452 407V393L438 407Z" fill="#edf0df" stroke="#7a8589"/>`+text(445,430,'Trap','device-note','text-anchor="middle"');
  }
 }
 if(c.openFWH)line([[675,124],[740,124],[740,255],[560,255],[560,323]],colors.bleed,'6 4');
 for(const q of c.states){const pos=xy[q.key];if(pos)badge(...pos,q.id,q.name);}
 s+=text(82,193,'q in','device-note','text-anchor="end"')+text(855,290,'q out','device-note');
 s+=text(650,148,'work out','device-note','text-anchor="middle"');
 s+=text(140,445,'Feedwater ←','device-note')+text(770,445,'Not to scale','device-note');
 if(c.closedFWH)s+=text(535,217,'Steam extraction','device-note');
 $('plant').innerHTML=s;
}
update();
