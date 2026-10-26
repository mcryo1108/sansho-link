import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../src/reference-linker.js',import.meta.url),'utf8').replace('return __toCommonJS(index_exports);','return {NativeLinkBounds};'),context);
const {NativeLinkBounds}=context.SanshoLink;
const corrector=new NativeLinkBounds();
const chars=[];
for(const [line,y] of [['Unrelated sentence before Lemma',20],['3) unrelated continuation text',8]]) {
 [...line].forEach((c,i)=>chars.push({c,u:c,rect:[i*5,y,i*5+5,y+10],offset:chars.length,rotation:0}));
}
const anchor=chars.find(c=>c.c==='L').offset;
const destinationPosition={pageIndex:5,rects:[[10,700,80,710]]};
const original={type:'internal-link',source:'matched',sortIndex:`00001|${String(anchor).padStart(6,'0')}|00000`,position:{pageIndex:1,rects:[[0,8,160,30]]},destinationPosition};
const before=JSON.stringify(original);
const fixed=corrector.narrow(original,chars);
assert.notEqual(fixed,original);assert.equal(JSON.stringify(original),before,'Original native object remains unchanged');
assert.equal(fixed.destinationPosition,destinationPosition,'Destination identity retained');
assert.equal(fixed.source,'matched');assert.equal(fixed.position.rects.length,2);
const covered=(overlay)=>chars.filter(c=>overlay.position.rects.some(r=>corrector.contains(r,c.rect))).map(c=>c.c).join('');
assert.equal(covered(fixed),'Lemma3','Only label glyphs remain inside the clickable/tinted rectangles');
assert.equal(corrector.narrow(fixed,chars),fixed,'Idempotent');
for(const variant of [
 {...original,type:'citation'}, {...original,source:'annotation'},
 {...original,sortIndex:'00001|99999|00000'},
 {...original,position:{pageIndex:1,rects:fixed.position.rects}},
 {...original,position:{pageIndex:1,rects:[[0,0,NaN,30]]}},
 {...original,position:{pageIndex:1,rects:[[0,8,160,30]],nextPageRects:[[0,0,10,10]]}}
]) assert.equal(corrector.narrow(variant,chars),variant,'Unsupported or non-automatic overlay left untouched');
assert.equal(corrector.narrow(original,chars.map(c=>({...c,rotation:90}))),original,'Rotation left untouched');
const annotation={type:'highlight',source:'annotation',position:original.position,color:'#76c6ff'};
const data={chars,overlays:[original,annotation]};const originalMerge=function(_index,value){return value;};
let renders=0;const prototype={_mergeProcessedPageData:originalMerge};
const view=Object.assign(Object.create(prototype),{_pdfPages:{1:data},_render(){renders++;},_hover:original.position,_selectedOverlay:original});
const reader={_internalReader:{_primaryView:view}};corrector.attachReader(reader);
assert.notEqual(view._pdfPages[1],data);assert.equal(covered(view._pdfPages[1].overlays[0]),'Lemma3');
assert.equal(view._pdfPages[1].overlays[1],annotation,'Saved annotation retained');
assert.equal(view._hover,view._pdfPages[1].overlays[0].position,'Hover bounds also corrected');
assert.equal(view._selectedOverlay,view._pdfPages[1].overlays[0]);
assert.equal(covered(view._mergeProcessedPageData(1,data).overlays[0]),'Lemma3','Future page data corrected');
const wrapper=view._mergeProcessedPageData;corrector.attachReader(reader);assert.equal(view._mergeProcessedPageData,wrapper,'No double wrapping');
corrector.detachReader(reader);
assert.equal(view._mergeProcessedPageData,originalMerge);assert(!Object.hasOwn(view,'_mergeProcessedPageData'));
assert.equal(view._pdfPages[1].overlays[0],original);assert.equal(view._hover,original.position);
assert.equal(corrector.patches.size,0);assert.equal(renders,2);
// A method supplied by a different plugin after ours must survive cleanup.
corrector.attachReader(reader);const retained=view._mergeProcessedPageData;const later=function(...args){return retained.apply(this,args);};view._mergeProcessedPageData=later;corrector.detachReader(reader);assert.equal(view._mergeProcessedPageData,later);assert.equal(view._mergeProcessedPageData(1,data),data,'A wrapper retained by another plugin becomes a passthrough after shutdown');
console.log('Narrow wrapped labels; preserve destination/annotations; future-page hook; hover; reversible cleanup passed (synthetic native data).');
