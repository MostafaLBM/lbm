export const fluids = [
 {name:'Nitrogen',label:'Nitrogen',Tmin:80,Tmax:1200,pmin:.1,pmax:30,defaults:[300,10,.1],note:'Start at room temperature, then heat the inlet until the temperature response changes sign.'},
 {name:'CarbonDioxide',label:'Carbon dioxide',Tmin:225,Tmax:1000,pmin:.6,pmax:30,defaults:[320,10,1],note:'Explore strong real-fluid effects. The outlet pressure stays above the triple-point pressure to avoid solid CO₂.'},
 {name:'Hydrogen',label:'Hydrogen',Tmin:30,Tmax:900,pmin:.1,pmax:30,defaults:[300,10,.1],note:'At this room-temperature preset, a pressure drop heats hydrogen. Try the precooled preset next.'},
 {name:'Helium',label:'Helium',Tmin:8,Tmax:1000,pmin:.1,pmax:30,defaults:[300,10,.1],note:'Room-temperature helium heats during throttling. Cooling requires much lower inlet temperatures.'},
 {name:'Methane',label:'Methane',Tmin:100,Tmax:600,pmin:.1,pmax:30,defaults:[300,10,.1],note:'Connect throttling to natural-gas processing; try precooling the inlet.'},
 {name:'R134a',label:'R134a',Tmin:180,Tmax:450,pmin:.1,pmax:10,defaults:[303,1,.3],note:'The default is a liquid inlet. Part of the liquid flashes into vapor after the pressure drop.'},
 {name:'Water',label:'Water / steam',Tmin:280,Tmax:1100,pmin:.1,pmax:30,defaults:[500,5,.1],note:'Compare a flashing hot-water inlet with superheated steam. Enthalpy remains constant in either case.'}
];
export const experiments=[
 {label:'Nitrogen · room-temperature cooling',fluid:'Nitrogen',values:[300,10,.1],question:'If the pressure falls, will the temperature rise or fall?'},
 {label:'Hydrogen · room-temperature heating',fluid:'Hydrogen',values:[300,10,.1],question:'Does expanding through a valve always cool a gas?'},
 {label:'Hydrogen · precooled to 100 K',fluid:'Hydrogen',values:[100,5,.1],question:'Can precooling reverse the temperature response?'},
 {label:'Helium · cryogenic inlet',fluid:'Helium',values:[15,1,.1],question:'How different is helium at 15 K from helium at room temperature?'},
 {label:'CO₂ · dense-fluid expansion',fluid:'CarbonDioxide',values:[320,10,1],question:'Can a single-phase inlet produce a two-phase outlet?'},
 {label:'R134a · liquid flashing',fluid:'R134a',values:[303,1,.3],question:'Where does the energy needed to vaporize some liquid come from?'},
 {label:'Water · superheated steam',fluid:'Water',values:[700,5,.1],question:'Does constant enthalpy imply constant temperature?'}
];
export function createModel(C){
 function prop(out,a,x,b,y,f){let v;try{v=C.PropsSI(out,a,x,b,y,f);}catch{throw Error('The property engine could not resolve this state. Adjust the inlet temperature or pressures.');}if(!Number.isFinite(v)||Math.abs(v)>1e50)throw Error('This state is outside the property model or lies on a phase boundary. Adjust the inlet temperature or pressures.');return v;}
 function statePH(f,p,h){const T=prop('T','P',p*1e6,'Hmass',h,f),q=prop('Q','P',p*1e6,'Hmass',h,f),s=prop('Smass','P',p*1e6,'Hmass',h,f);return {p,T,h,s,q:q>=0&&q<=1?q:null};}
 function phase(f,T,p,q){if(q!==null)return q===0?'Saturated liquid':q===1?'Saturated vapor':'Liquid + vapor';const pc=C.PropsSI('pcrit','',0,'',0,f),tc=C.PropsSI('Tcrit','',0,'',0,f);if(p*1e6>=pc)return T>=tc?'Supercritical fluid':'Liquid-like fluid';if(T>=tc)return 'Gas';try{return T>prop('T','P',p*1e6,'Q',0,f)?'Vapor':'Liquid';}catch{return 'Single phase';}}
 function mu(f,T,p){const q=prop('Q','T',T,'P',p*1e6,f);if(q>=0&&q<=1)return null;const cp=prop('Cpmass','T',T,'P',p*1e6,f),rho=prop('Dmass','T',T,'P',p*1e6,f),alpha=prop('isobaric_expansion_coefficient','T',T,'P',p*1e6,f);return (T*alpha-1)/(rho*cp)*1e6;}
 function solve(o){const f=fluids.find(f=>f.name===o.fluid);if(!f)throw Error('Choose a supported fluid.');const {T,p1,p2}=o;if(![T,p1,p2].every(Number.isFinite)||T<f.Tmin||T>f.Tmax||p1>f.pmax||p2<f.pmin||p1<=p2)throw Error('Use a valid temperature and an outlet pressure below the inlet pressure.');const h=prop('Hmass','T',T,'P',p1*1e6,f.name),a=statePH(f.name,p1,h),b=statePH(f.name,p2,h);a.phase=phase(f.name,a.T,a.p,a.q);b.phase=phase(f.name,b.T,b.p,b.q);const m=mu(f.name,T,p1);const path=[];for(let i=0;i<=100;i++){const p=p1+(p2-p1)*i/100;try{path.push(statePH(f.name,p,h));}catch{path.push(null);}}return {fluid:f.name,a,b,mu:m,delta:b.T-a.T,ds:(b.s-a.s)/1000,path};}
 function inversion(f){const lines=[[],[]];for(let i=0;i<=32;i++){const p=f.pmin+(f.pmax-f.pmin)*i/32,roots=[];let prev=null;for(let j=0;j<=48;j++){const T=f.Tmin*Math.pow(f.Tmax/f.Tmin,j/48);let v;try{v=mu(f.name,T,p);}catch{prev=null;continue;}if(v===null){prev=null;continue;}if(prev&&v*prev.v<0){let lo=prev.T,hi=T,vl=prev.v,ok=true;for(let k=0;k<24;k++){const mid=(lo+hi)/2;try{const vm=mu(f.name,mid,p);if(vm===null){ok=false;break;}if(vl*vm<=0)hi=mid;else{lo=mid;vl=vm;}}catch{ok=false;break;}}const root=(lo+hi)/2;try{if(ok&&Math.abs(mu(f.name,root,p))<.005)roots.push({p,T:root});}catch{}}
 prev={T,v};}lines[0].push(roots.length?roots[roots.length-1]:null);lines[1].push(roots.length>1?roots[0]:null);}return lines;}
 return {prop,solve,mu,inversion,statePH};
}
