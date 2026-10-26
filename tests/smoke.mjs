import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);
const code=fs.readFileSync(new URL('../src/reference-linker.js',import.meta.url),'utf8');
vm.runInContext(code.replace('return __toCommonJS(index_exports);','return {ReferenceOverlay};'),context);
const api=context.SanshoLink;
class Element {
 constructor(doc,text='',parent=null){this.doc=doc;this.textContent=text;this.parent=parent;this.children=[];this.style={};this.attrs={};this.names=new Set();this.classList={add:(...x)=>x.forEach(n=>this.names.add(n)),remove:(...x)=>x.forEach(n=>this.names.delete(n))};}
 set className(s){this.names=new Set(s.split(' '));} get className(){return [...this.names].join(' ');}
 set title(s){this.attrs.title=s;}get title(){return this.attrs.title||'';}
 getAttribute(n){return this.attrs[n]??null;}setAttribute(n,v){this.attrs[n]=v;}removeAttribute(n){delete this.attrs[n];}
 append(node){this.children.push(node);node.parent=this;this.doc.nodes.push(node);}
 closest(q){for(let e=this;e;e=e.parent)if(q==='.'+[...e.names][0]||e.names.has(q.slice(1)))return e;return null;}
 getBoundingClientRect(){return {left:0,right:100,top:0,bottom:20,width:1000,height:1000};}
 addEventListener(){} removeEventListener(){} remove(){this.doc.nodes=this.doc.nodes.filter(n=>n!==this);}
 querySelectorAll(q){return q==='.textLayer span'?this.spans||[]:[];}
}
function documentFor(pages){const d={nodes:[],pages:[],defaultView:{Element},getElementById:()=>null,addEventListener(){},removeEventListener(){},createElement(){return new Element(d);},querySelectorAll(q){if(q==='.page')return d.pages;const cs=q.split(',').map(s=>s.trim().slice(1));return d.nodes.filter(n=>cs.some(c=>n.names.has(c)));}};d.head=new Element(d);d.body=new Element(d);for(const [index,items] of pages){const p=new Element(d);p.names.add('page');p.dataset={pageNumber:String(index+1)};p.spans=items.filter(i=>'str'in i).map(i=>{const e=new Element(d,i.str,p);e.fontName=i.fontName;d.nodes.push(e);return e;});d.pages.push(p);}return d;}
const match={record:{item:{id:1},title:'Synthetic title',pdfAttachmentID:2},method:'title'};
// Bibliography start must retain its entire marker after punctuation removal.
for (const label of ['[1]','[ 1 ]','1.','1)']) {
  for (const omitLabel of [false,true]) {
    const body = '[1] This is an earlier body citation that must stay unstyled.';
    const raw = `${label} A. Author, First sufficiently long bibliography title, 2001.`;
    const reference = {index:1,raw:omitLabel ? raw.slice(label.length).trim() : raw};
    const second = `${label.replace('1','2')} B. Author, Second sufficiently long bibliography title, 2002.`;
    const refs=[reference,{index:2,raw:second}];
    const doc=documentFor([[0,[{str:body},{str:label},{str:raw.slice(label.length)},{str:second}]]]);
    const overlay=new api.ReferenceOverlay(doc,()=>{});
    overlay.indexPages(0,0,undefined,undefined,refs);
    assert(overlay.renderIndexedUnmatched(1,{title:raw}),`Retain first marker ${label}, omitLabel=${omitLabel}`);
    assert(doc.pages[0].spans[1].names.has('sansho-link-unmatched'));
    assert(!doc.pages[0].spans[0].names.has('sansho-link-unmatched'),'Never color earlier body citation');
    overlay.clear();
    assert(overlay.renderIndexed(1,match),'First reference can also link to a library PDF');
    assert.equal(overlay.linkCount(),1);
  }
}
console.log('Bibliography first-marker regression passed (synthetic DOM; not a native UI test).');
