import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);
const code=fs.readFileSync(new URL(process.argv[2] || '../src/reference-linker.js',import.meta.url),'utf8');
vm.runInContext(code.replace('return __toCommonJS(index_exports);','return {ReaderIntegration};'),context);
const {ReaderIntegration}=context.SanshoLink;
class Node {
 constructor(doc){this.ownerDocument=doc;this.children=[];this.style={};this.attributes={};this.parent=null;}
 append(node){this.children.push(node);node.parent=this;}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k]??null;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 closest(q){let n=this;while(n){if(q==='[data-sansho-link-section="true"]'&&n.attributes['data-sansho-link-section']==='true')return n;n=n.parent;}return null;}
 addEventListener(){}
 getBoundingClientRect(){return {bottom:24};}
}
function fixture(){
 const doc={getElementById:()=>null,documentElement:{}};
 doc.body=new Node(doc);doc.head=new Node(doc);const host=new Node(doc);
 doc.createElement=()=>new Node(doc);
 doc.querySelector=q=>q==='.toolbar .end .custom-sections'?host:null;
 const all=()=>{const a=[];const walk=n=>{a.push(n);n.children.forEach(walk);};walk(host);return a;};
 doc.querySelectorAll=()=>all().filter(n=>n.attributes['aria-label']==='参照リンク：参考文献を再スキャン');
 const timers=new Set();const win={document:doc,MutationObserver:class{observe(){}disconnect(){}},addEventListener(){},removeEventListener(){},setTimeout:f=>{timers.add(f);return f;},clearTimeout:f=>timers.delete(f)};doc.defaultView=win;
 const reader={_iframeWindow:win,_initPromise:Promise.resolve()};
 const handlers=new Set();const errors=[];
 const zotero={Reader:{_readers:[reader],registerEventListener:(_type,h)=>handlers.add(h),unregisterEventListener:(_type,h)=>handlers.delete(h)},logError:e=>errors.push(e)};
 return {doc,host,reader,zotero,handlers,timers,errors};
}
const f=fixture();
const one=new ReaderIntegration(f.zotero,'test');one.start();await new Promise(setImmediate);
assert.equal(f.doc.querySelectorAll().length,1,'Already-open PDFs get a toolbar on enable/update');assert.equal(one.readers.size,1);assert.equal(f.timers.size,1);
one.restoreOpenReader(f.reader);assert.equal(f.doc.querySelectorAll().length,1,'Repeated restoration never duplicates the button');
one.stop();assert.equal(f.doc.querySelectorAll().length,0);assert.equal(f.host.children.length,0,'Owned toolbar section removed');assert.equal(f.handlers.size,0);assert.equal(f.timers.size,0);
const two=new ReaderIntegration(f.zotero,'test');two.start();await new Promise(setImmediate);assert.equal(f.doc.querySelectorAll().length,1,'Hot update restores the same PDF');two.stop();
const stopped=new ReaderIntegration(f.zotero,'test');stopped.start();stopped.stop();await new Promise(setImmediate);assert.equal(f.doc.querySelectorAll().length,0,'Late initialization cannot resurrect a stopped plugin');
const integration=new ReaderIntegration(f.zotero,'test');integration.getPdfDocument=()=>({});let scans=0;integration.sectionExtractor.extract=async()=>++scans===1?undefined:{references:[{index:1}]};const state={};
assert.equal(await integration.getReferenceSection({},state),undefined);await Promise.resolve();assert.equal(state.sectionPromise,undefined,'An empty extraction is not cached forever');assert.equal((await integration.getReferenceSection({},state)).references.length,1);assert.equal(scans,2);
assert.deepEqual(f.errors,[]);
console.log('Existing-reader restore, no duplicates, shutdown cleanup and empty-cache retry passed (mocked Zotero/DOM).');
