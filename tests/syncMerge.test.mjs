import assert from 'node:assert/strict';
import { mergeRecords } from '../src/services/syncMerge.js';

function runCases(merge,assert){
  const a={id:"a",title:"Original"},b={id:"b",title:"Other"},a1={...a,title:"Phone edit"},b1={...b,title:"Tablet edit"};
  const cases=[
    ["independent edits",()=>assert(merge({base:[a,b],local:[a1,b],remote:[a,b1]}).records,[a1,b1])],
    ["independent additions",()=>assert(merge({base:[],local:[a],remote:[b]}).records,[a,b])],
    ["first sync retains both sides",()=>assert(merge({base:null,local:[a],remote:[b]}).records,[a,b])],
    ["first sync divergent ID blocks",()=>assert(merge({base:null,local:[a],remote:[a1]}).ok,false)],
    ["deletion propagates against unchanged base",()=>assert(merge({base:[a],local:[],remote:[a]}).records,[])],
    ["edit versus deletion blocks",()=>assert(merge({base:[a],local:[],remote:[a1]}),{ok:false,records:null,conflicts:[{id:"a",base:a,local:null,remote:a1}]})],
    ["different edits block",()=>assert(merge({base:[a],local:[a1],remote:[{...a,title:"Tablet edit"}]}).ok,false)],
    ["matching edits converge",()=>assert(merge({base:[a],local:[a1],remote:[a1]}).records,[a1])],
    ["object key order ignored",()=>assert(merge({base:[a],local:[{title:a.title,id:a.id}],remote:[a1]}).records,[a1])],
    ["no aliasing of input records",()=>{const out=merge({base:[],local:[a],remote:[]});out.records[0].title="changed";assert(a.title,"Original")}],
    ["duplicate IDs rejected",()=>{let threw=false;try{merge({base:[],local:[a,a],remote:[]})}catch{threw=true}assert(threw,true)}],
    ["missing remote snapshot rejected",()=>{let threw=false;try{merge({base:[a],local:[a]})}catch{threw=true}assert(threw,true)}],
    ["invalid IDs rejected",()=>{let threw=false;try{merge({base:[],local:[{}],remote:[]})}catch{threw=true}assert(threw,true)}]
  ];
  for(const [name,fn] of cases){try{fn()}catch(error){throw new Error(`${name}: ${error.message}`)}}
  return cases.map(([name])=>name);
}

const passed=runCases(mergeRecords,assert.deepEqual);
console.log('Passed '+passed.length+' merge cases:',passed.join('; '));
