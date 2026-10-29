import load from './vendor/coolprop.js';
import {fluids} from './catalog.js';
import {createModel} from './model.js';
let model;
try{const cp=await load();model=createModel(cp,fluids);postMessage({type:'ready',version:cp.get_global_param_string('version')});}
catch(e){postMessage({type:'fatal',error:'The refrigerant property engine could not load. Reload the page and check your connection.'});}
self.onmessage=({data})=>{
 if(!model)return;
 const {id,input}=data;
 try{
  const sourceMode=input.valueMode||input.mode;
  let d=model.inputState(input.fluid,sourceMode,input.a,input.b);
  if(sourceMode!==input.mode){
   d=input.mode==='pressure'?model.inputState(input.fluid,'pressure',model.satP(input.fluid,d.Te,1),model.satP(input.fluid,d.Tc,0)):model.inputState(input.fluid,'temperature',d.Te,d.Tc);
  }
  const f=model.get(input.fluid),maxSC=Math.max(0,Math.min(30,d.Tc-f.Tmin-.5));
  const o={fluid:input.fluid,Te:d.Te,Tc:d.Tc,superheat:input.superheat,subcool:Math.min(input.subcool,maxSC),eta:input.eta,Qload:input.Qload};
  const cycle=model.solve(o);
  postMessage({type:'cycle',id,cycle,controls:{...d,maxSC,subcool:o.subcool}});
  const plot=model.curves(cycle);
  postMessage({type:'plot',id,plot});
 }catch(e){postMessage({type:'error',id,error:e instanceof Error?e.message:String(e)});}
};
