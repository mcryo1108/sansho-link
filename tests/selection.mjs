import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={}; vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../src/reference-linker.js',import.meta.url),'utf8').replace('return __toCommonJS(index_exports);','return {ReferenceOverlay};'),c);
class Element {closest(q){return q==='.sansho-link-hit'?this:null;}}
const listeners=new Map(); let domSelected=false,readerSelected=false,opened=0;
const doc={defaultView:{Element,getSelection:()=>({isCollapsed:!domSelected})},getElementById:()=>({remove(){}}),addEventListener:(t,h)=>listeners.set(t,h),removeEventListener:(t,h)=>{assert.equal(listeners.get(t),h);listeners.delete(t);},querySelectorAll:()=>[]};
const overlay=new c.SanshoLink.ReferenceOverlay(doc,()=>opened++,undefined,undefined,()=>readerSelected);
const target=new Element(); overlay.hits.set(target,{record:{}});
function click(extra={}) {let cancelled=false;const event={target,button:0,detail:1,preventDefault(){cancelled=true;},stopPropagation(){cancelled=true;},...extra};listeners.get('click')(event);return cancelled;}
function gesture(type,x,y) {listeners.get(type)({type,button:0,clientX:x,clientY:y,preventDefault(){assert.fail('Must not block Zotero selection');},stopPropagation(){assert.fail('Must not block Zotero selection');}});}
assert.equal(click(),true);assert.equal(opened,1,'Simple click still opens reference');
for(const events of [['pointerdown','pointermove','pointerup'],['mousedown','mousemove','mouseup']]) {
 gesture(events[0],10,10);gesture(events[1],40,10);gesture(events[2],40,10);
 assert.equal(click(),false,'Drag-end click must reach Zotero');
}
// Drag returns to its origin, where final displacement alone would miss it.
gesture('pointerdown',0,0);gesture('mousedown',0,0);gesture('pointermove',30,0);gesture('pointerup',0,0);assert.equal(click(),false);
readerSelected=true;assert.equal(click(),false,'Canvas selection must survive with collapsed DOM selection');readerSelected=false;
domSelected=true;assert.equal(click(),false);domSelected=false;
for(const extra of [{detail:2},{detail:3},{altKey:true},{shiftKey:true},{button:2}])assert.equal(click(extra),false);
assert.equal(opened,1,'No accidental reference navigation during selection');
gesture('pointerdown',0,0);gesture('pointerup',1,1);assert.equal(click(),true);assert.equal(opened,2,'Subsequent simple click still works');
overlay.destroy();assert.equal(listeners.size,0,'All event observers cleaned up');
console.log('Mouse/pointer drag, return drag, native/DOM selection, multi-click, modifiers, normal click and cleanup passed.');
