// Regression for the live Gecko compartment failure, not geometry-only mocks.
// The PDF reader's native method and page objects must never be replaced.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={};vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../src/reference-linker.js',import.meta.url),'utf8').replace('return __toCommonJS(index_exports);','return {ReaderIntegration};'),c);
const errors=[];const integration=new c.SanshoLink.ReaderIntegration({logError:e=>errors.push(e)},'test');
const nativeMerge=function(_index,data){return data;};const pages={0:{chars:[{c:'Text'}],overlays:[]}};
let mergeWrites=0,pageWrites=0,renders=0;
const view={get _mergeProcessedPageData(){return nativeMerge;},set _mergeProcessedPageData(_v){mergeWrites++;throw Error('Must not install privileged functions in the PDF realm');},get _pdfPages(){return pages;},set _pdfPages(_v){pageWrites++;throw Error('Must not replace native page data');},_render(){renders++;}};
const reader={_internalReader:{_primaryView:view,_secondaryView:view}};
integration.attach(reader);
assert.equal(view._mergeProcessedPageData,nativeMerge);
assert.equal(view._mergeProcessedPageData(0,pages[0]),pages[0]);
assert.equal(view._pdfPages[0],pages[0]);
// scan's early exit still must not patch the native reader.
integration.getViewerDocument=()=>undefined;
await integration.scan(reader,false);
integration.destroyReader(reader);
assert.equal(mergeWrites,0);assert.equal(pageWrites,0);assert.equal(renders,0);
assert.deepEqual(errors,[]);
console.log('Native PDF method/page identity preserved across attach, scan and cleanup; no privileged method injection.');
