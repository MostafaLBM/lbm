import {fluids} from './catalog.js';
const $=id=>document.getElementById(id);
let state={fluid:'R134a',scenario:0,preset:true,mode:'temperature',valueMode:'temperature',a:2,b:40,superheat:5,subcool:5,eta:.75,Qload:100,loadMax:500};
let worker,ready=false,busy=false,revision=0,sent=0,lastCycle=null,lastControls=null,note='';
const specs=[['a','Evaporator dew temperature','°C',-60,20],['b','Condenser bubble temperature','°C',-57,80],['superheat','Suction superheat','K',0,40],['subcool','Liquid subcooling','K',0,30],['eta','Compressor isentropic efficiency','',.5,1],['Qload','Cooling load','kW',.01,500]];
for(const [key,label,unit,min,max] of specs){
 const box=document.createElement('div');box.className='control';
 box.innerHTML=`<div class="input-head"><label id="${key}-label" for="${key}-number">${label}</label><span class="number-wrap"><input id="${key}-number" type="number" inputmode="decimal" min="${min}" max="${max}" step="any" aria-describedby="${key}-bounds"><small id="${key}-unit">${unit}</small></span></div><input class="range" id="${key}-range" type="range" min="${min}" max="${max}" step="any" aria-label="${label}"><div class="limits" id="${key}-bounds"><span></span><span></span></div>`;
 $('inputs').append(box);
 const number=$(`${key}-number`),range=$(`${key}-range`);
 range.addEventListener('input',()=>{state[key]=Number(range.value);number.value=range.value;manual();});
 number.addEventListener('change',()=>{
  if(!Number.isFinite(number.valueAsNumber)){number.value=state[key];$('status').textContent='Please enter a numeric value.';return;}
  const raw=number.valueAsNumber,clamped=Math.max(Number(range.min),Math.min(Number(range.max),raw));
  state[key]=clamped;note=raw!==clamped?'Value adjusted to the supported range.':'';range.value=String(clamped);number.value=String(clamped);manual();
 });
 number.addEventListener('keydown',e=>{if(e.key==='Enter'){number.dispatchEvent(new Event('change'));number.blur();}});
}
$('fluid').innerHTML=fluids.map(f=>`<option value="${f.name}">${f.label}</option>`).join('');
const currentFluid=()=>fluids.find(f=>f.name===state.fluid);
function syncScenario(){
 const f=currentFluid();$('fluid').value=f.name;
 $('scenario').innerHTML=f.presets.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');$('scenario').value=state.scenario;
 const p=f.presets[state.scenario],v=p.values;
 $('application-name').textContent=p.name;$('why').textContent=p.why;$('context').textContent=p.context;
 $('scenario-details').innerHTML=`<p>Illustrative operating point:</p><ul><li>Evaporator dew: ${v[0]} °C</li><li>Condenser bubble: ${v[1]} °C</li><li>Superheat / subcooling: ${v[2]} / ${v[3]} K</li><li>Compressor efficiency: ${v[4]}</li><li>Cooling load: ${v[5]} kW (${(v[5]*3412.14163312794).toFixed(0)} Btu/h)</li></ul><p>Teaching assumptions, not certified equipment ratings.</p>`;
 $('family').textContent=f.family;$('safety').textContent=f.safety;$('flammability').textContent=f.flammability;$('toxicity').textContent=f.toxicity;
 $('gwp').textContent=`${f.gwp100} (${f.gwpBasis})`;$('odp').textContent=f.odp;$('critical').textContent=f.Tcrit.toFixed(2)+' °C';$('fluid-tag').textContent=f.label;
}
function applyPreset(){
 const v=currentFluid().presets[state.scenario].values;
 [state.a,state.b,state.superheat,state.subcool,state.eta,state.Qload]=v;
 state.valueMode='temperature';state.preset=true;state.loadMax=Math.max(1,5*v[5]);lastControls=null;syncScenario();syncControls();request();
}
$('fluid').addEventListener('change',()=>{state.fluid=$('fluid').value;state.scenario=0;applyPreset();});
$('scenario').addEventListener('change',()=>{state.scenario=Number($('scenario').value);applyPreset();});
$('preset').addEventListener('change',()=>{if($('preset').checked)applyPreset();else{state.preset=false;syncControls();}});
$('mode').addEventListener('change',()=>{state.mode=$('mode').value;syncControls();request();});
$('reset').addEventListener('click',()=>{state={...state,fluid:'R134a',scenario:0,mode:'temperature',valueMode:'temperature'};$('mode').value='temperature';applyPreset();});
function manual(){state.preset=false;syncControls();request();}
function syncControls(){
 const f=currentFluid(),pressure=state.valueMode==='pressure';
 const lo=Math.max(-60,f.Tmin+1),hi=Math.min(80,f.Tcrit-1);
 let limits=[[lo,Math.min(20,hi-3)],[state.valueMode==='temperature'?state.a+3:lo+3,hi]];
 if(lastControls&&lastControls.mode===state.valueMode)limits=lastControls.limits;
 specs.forEach(([key,label,unit,min,max],i)=>{
  if(i<2){[min,max]=limits[i];if(pressure){label=i===0?'Evaporator pressure':'Condenser pressure';unit='kPa';}}
  if(key==='Qload')max=state.loadMax;
  if(key==='subcool')max=lastControls?.maxSC??30;
  const range=$(`${key}-range`),number=$(`${key}-number`);
  range.min=number.min=String(min);range.max=number.max=String(max);
  range.value=String(state[key]);number.value=String(Number(state[key].toFixed(7)));
  $(`${key}-label`).textContent=label;$(`${key}-unit`).textContent=unit;range.setAttribute('aria-label',`${label}${unit?' in '+unit:''}${pressure&&i<2?' absolute':''}`);
  const fmt=x=>Number(x.toFixed(pressure&&i<2?2:3));
  $(`${key}-bounds`).children[0].textContent=`${fmt(min)} ${unit}`;$(`${key}-bounds`).children[1].textContent=`${fmt(max)} ${unit}`;
  const disabled=!ready||(i<2&&state.valueMode!==state.mode);range.disabled=number.disabled=disabled;
 });
 $('mode').value=state.mode;$('preset').checked=state.preset;
 $('preset-status').textContent=state.preset?'Application preset':'Custom settings · based on the selected scenario';
 $('load-equivalent').textContent=`Cooling load: ${(state.Qload*3412.14163312794).toLocaleString(undefined,{maximumFractionDigits:0})} Btu/h (International Table).`;
}
function request(){
 revision++;lastCycle=null;window.currentCycle=null;
 document.querySelector('.results').classList.add('is-loading');document.querySelector('.results').setAttribute('aria-busy','true');document.querySelector('.metrics').classList.add('is-loading');
 $('status').className='status';$('status').textContent=ready?'Updating cycle…':'Loading refrigerant properties…';flush();
}
function flush(){
 if(!ready||busy||sent===revision)return;busy=true;sent=revision;worker.postMessage({id:sent,input:{...state}});
}
function error(message){
 lastCycle=null;window.currentCycle=null;$('status').className='status error';$('status').textContent=message;
 for(const id of ['cop','power','mass','duty','reject','ql','work','qh','heating-cop','ratio','volume'])$(id).textContent='—';
 for(const id of ['ts','ph','plant','states'])$(id).innerHTML='';$('glide').textContent='';
 document.querySelector('.results').classList.remove('is-loading');document.querySelector('.results').setAttribute('aria-busy','false');document.querySelector('.metrics').classList.remove('is-loading');
}
function renderCycle(c,d){
 lastCycle=c;lastControls=d;window.currentCycle=c;
 state.a=d.values[0];state.b=d.values[1];state.valueMode=d.mode;state.subcool=d.subcool;syncControls();
 $('cop').textContent=c.COP.toFixed(3);$('power').textContent=c.power.toFixed(c.power<1?3:2);$('mass').textContent=c.mdot.toFixed(c.mdot<.01?5:4);
 document.querySelector('.metrics').classList.remove('is-loading');
 const vals={duty:c.Qload.toFixed(3)+' kW',reject:c.Qreject.toFixed(3)+' kW',ql:c.qL.toFixed(2)+' kJ/kg',work:c.w.toFixed(2)+' kJ/kg',qh:c.qH.toFixed(2)+' kJ/kg','heating-cop':c.COPheating.toFixed(3),ratio:c.pressureRatio.toFixed(2),volume:(3600*c.volumeFlow).toFixed(2)+' m³/h'};
 for(const [id,val] of Object.entries(vals))$(id).textContent=val;
 $('states').innerHTML=c.states.map(q=>`<tr><td>${q.id}</td><td>${q.name}</td><td>${q.T.toFixed(2)}</td><td>${q.p.toFixed(2)}</td><td>${q.h.toFixed(2)}</td><td>${q.s.toFixed(4)}</td><td>${q.phase}</td></tr>`).join('');
 $('glide').textContent=c.blend?`Pseudo-pure blend EOS · Evaporator glide: ${(c.evaporatorDew-c.evaporatorBubble).toFixed(2)} K · Condenser glide: ${(c.condenserDew-c.condenserBubble).toFixed(2)} K. Inputs use evaporator dew and condenser bubble temperatures.`:`Pure refrigerant · Evaporator saturation: ${c.Te.toFixed(2)} °C · Condenser saturation: ${c.Tc.toFixed(2)} °C.`;
 $('status').textContent='Updating diagrams…';drawPlant(c);
}
try{
 if(location.protocol==='file:'){$('file-help').hidden=false;throw new Error('Open this applet through the course website or Start-local-preview.cmd.');}
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{
  if(data.type==='ready'){ready=true;window.engineVersion=data.version;syncControls();flush();return;}
  if(data.type==='fatal'){error(data.error);return;}
  if(data.type==='cycle'&&data.id===revision)renderCycle(data.cycle,data.controls);
  if(data.type==='plot'){
   if(data.id===revision&&lastCycle){drawPlots(lastCycle,data.plot);document.querySelector('.results').classList.remove('is-loading');document.querySelector('.results').setAttribute('aria-busy','false');$('status').textContent=note||'Pressures are absolute. Refrigerant properties: CoolProp 7.2.0.';note='';window.plotsReady=data.id;}
   busy=false;flush();
  }
  if(data.type==='error'){if(data.id===revision)error(data.error);busy=false;flush();}
 };
 worker.onerror=()=>{busy=false;error('The refrigerant engine could not start. Reload the page; when previewing locally, use Start-local-preview.cmd.');};
}catch(e){error(e.message);}
syncScenario();syncControls();if(worker)request();

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,cls='',extra='')=>`<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(s)}</text>`;
const colors=['#7953a0','#c15a2c','#7a8589','#128a88'];
const line=(pts,color,width=2.5,dash='')=>`<path d="${pts.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(' ')).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;
function ticks(min,max,count=6){const rough=(max-min)/count,power=10**Math.floor(Math.log10(rough));const step=[1,2,2.5,5,10].map(v=>v*power).find(v=>v>=rough)||10*power;const out=[];for(let t=Math.ceil(min/step)*step;t<=max+step*1e-6;t+=step)out.push(Number(t.toPrecision(10)));return out;}
function drawPlots(c,plot){
 const f=currentFluid(),all=plot.paths.flat(),Tmin=Math.min(c.evaporatorBubble,...all.map(q=>q.T)),Tmax=Math.max(...all.map(q=>q.T)),dT=Math.max(10,(Tmax-Tmin)*.15);
 const smin=Math.min(c.sfE,...all.map(q=>q.s)),smax=Math.max(...all.map(q=>q.s)),ds=Math.max(.1,smax-smin);
 const hmin=Math.min(c.hfE,...c.h),hmax=Math.max(...c.h),dh=Math.max(10,hmax-hmin);
 draw('ts',{xmin:smin-.15*ds,xmax:smax+.2*ds,ymin:Tmin-dT,ymax:Tmax+dT,xkey:'s',ykey:'T',xlabel:'Specific entropy, s [kJ/(kg K)]',ylabel:'Temperature [°C]'},[f.dome.map(r=>({s:r[1],T:r[0]})),f.dome.map(r=>({s:r[2],T:r[0]}))]);
 draw('ph',{xmin:hmin-.1*dh,xmax:hmax+.15*dh,ymin:c.p[0]/1.8,ymax:c.p[1]*1.8,xkey:'h',ykey:'p',xlabel:'Specific enthalpy, h [kJ/kg]',ylabel:'Absolute pressure [kPa] · log scale',log:true},[f.dome.map(r=>({h:r[3],p:r[5]})),f.dome.map(r=>({h:r[4],p:r[6]}))]);
 function draw(id,a,dome){
  const sx=x=>72+(x-a.xmin)/(a.xmax-a.xmin)*647;
  const yval=x=>a.log?Math.log10(x):x,low=yval(a.ymin),high=yval(a.ymax),sy=y=>392-(yval(y)-low)/(high-low)*344;
  let s=`<defs><clipPath id="${id}-clip"><rect x="72" y="48" width="647" height="344"/></clipPath></defs>`;
  for(const x of ticks(a.xmin,a.xmax)){const px=sx(x);s+=`<line class="grid" x1="${px}" x2="${px}" y1="48" y2="392"/>`+text(px,415,Math.abs(x)<1e-10?'0':Number(x.toPrecision(5)),'tick','text-anchor="middle"');}
  let ys=[];
  if(a.log){for(let exp=Math.floor(low);exp<=Math.ceil(high);exp++)for(const n of [1,2,5]){const p=n*10**exp;if(p>=a.ymin&&p<=a.ymax)ys.push(p);}}
  else ys=ticks(a.ymin,a.ymax);
  for(const y of ys){const py=sy(y);s+=`<line class="grid" x1="72" x2="719" y1="${py}" y2="${py}"/>`+text(61,py+4,Number(y.toPrecision(5)),'tick','text-anchor="end"');}
  s+=text(395,447,a.xlabel,'axis-label','text-anchor="middle"')+`<text class="axis-label" transform="translate(17 221) rotate(-90)" text-anchor="middle">${a.ylabel}</text>`;
  s+=`<g clip-path="url(#${id}-clip)">`;
  for(const branch of dome)s+=line(branch.map(q=>[sx(q[a.xkey]),sy(q[a.ykey])]),'#b9c2b6',1.8);
  s+=line(plot.ideal.map(q=>[sx(q[a.xkey]),sy(q[a.ykey])]),'#929e98',1.4,'5 4');
  plot.paths.forEach((pts,k)=>{
   const p=pts.map(q=>[sx(q[a.xkey]),sy(q[a.ykey])]);s+=line(p,colors[k],2.8);
   const i=Math.floor(p.length*.55),u=p[i],v=p[i+1];if(u&&v){const angle=Math.atan2(v[1]-u[1],v[0]-u[0])*180/Math.PI;s+=`<path d="M-5 -4L2 0L-5 4" fill="none" stroke="${colors[k]}" stroke-width="2" transform="translate(${u}) rotate(${angle})"/>`;}
  });
  const labels=[];
  for(const q of c.states){const x=sx(q[a.xkey]),y=sy(q[a.ykey]);s+=`<circle cx="${x}" cy="${y}" r="4" fill="#fffefa" stroke="#19363d" stroke-width="1.5"><title>State ${q.id}: ${q.name}</title></circle>`;let ly=y-11;while(labels.some(l=>Math.abs(l.x-x)<27&&Math.abs(l.y-ly)<16))ly-=17;labels.push({x,y:ly});s+=text(x+9,ly,q.id,'state-label');}
  s+='</g>';$(id).innerHTML=s;
 }
}
function drawPlant(c){
 let s='<defs><marker id="flow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#56746c"/></marker></defs>';
 s+=line([[190,330],[190,105]],'#7953a0',2.5)+line([[190,105],[710,105]],'#c15a2c',2.5)+line([[710,105],[710,330]],'#7a8589',2.5)+line([[710,330],[190,330]],'#128a88',2.5);
 const box=(x,y,w,h,label,fill)=>{s+=`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#78918b"/>`+text(x,y+4,label,'device-label','text-anchor="middle"');};
 box(450,105,170,62,'Condenser','#fbe7d6');box(450,330,170,62,'Evaporator','#dff1ed');
 s+=`<circle cx="190" cy="220" r="34" fill="#eee3f4" stroke="#7953a0" stroke-width="1.5"/><path d="M177 239L202 220L177 201Z" fill="#7953a0" transform="rotate(-90 190 220)"/>`;
 s+=`<path d="M690 198L730 242V198L690 242Z" fill="#e5e7df" stroke="#7a8589"/>`;
 s+=text(115,224,'Compressor','device-label','text-anchor="end"')+text(747,224,'Valve','device-label');
 s+=text(450,55,'Heat rejected → surroundings','device-note','text-anchor="middle"')+text(450,391,'Heat absorbed ← cooled space','device-note','text-anchor="middle"');
 s+=text(450,218,`COP = ${c.COP.toFixed(2)}`,'device-label','text-anchor="middle"')+text(450,243,'Compressor work supplied','device-note','text-anchor="middle"');
 s+='<path d="M190 167V145M570 105H600M710 265V287M330 330H300" fill="none" stroke="#56746c" stroke-width="2" marker-end="url(#flow)"/>';
 const positions=[[190,280],[190,151],[710,151],[710,280]];
 c.states.forEach((q,i)=>{const [x,y]=positions[i];s+=`<g><title>State ${q.id}: ${q.name}</title><circle cx="${x}" cy="${y}" r="12" class="state-badge"/>`+text(x,y,q.id,'badge-text')+'</g>';});
 s+=text(765,425,'Not to scale','device-note');$('plant').innerHTML=s;
}
