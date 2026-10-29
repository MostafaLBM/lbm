import load from '../vapor-compression/vendor/coolprop.js';
import {createModel,fluids} from './model.js';
let model;const cache=new Map();
try{const C=await load();model=createModel(C);postMessage({type:'ready',version:C.get_global_param_string('version')});}catch(e){postMessage({type:'fatal',error:'The property engine could not load. Reload the page. For local use, run Start-local-preview.cmd from the course folder.'});}
self.onmessage=({data})=>{if(!model)return;const {id,input,type}=data;try{if(type==='inversion'){if(!cache.has(input.fluid))cache.set(input.fluid,model.inversion(fluids.find(f=>f.name===input.fluid)));postMessage({type:'inversion',id,fluid:input.fluid,lines:cache.get(input.fluid)});}else postMessage({type:'cycle',id,cycle:model.solve(input)});}catch(e){postMessage({type:'error',id,error:e.message||String(e)});}};
