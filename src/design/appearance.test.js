import {test} from "node:test";
import assert from "node:assert/strict";
import {PRESETS,ROLES,normalizeAppearance,resolvePalette,contrastRatio,onColour} from "./appearance.js";
test("legacy remains default for existing installations",()=>{
  assert.equal(normalizeAppearance(undefined).selected,"legacy");
  assert.equal(resolvePalette(undefined,true).background,"#0F172A");
  assert.equal(resolvePalette(undefined,false).background,"#F8FAFC");
});
test("every preset has all semantic roles in both modes",()=>{
  for(const [selected,preset] of Object.entries(PRESETS)){
    for(const dark of [true,false]){
      const p=resolvePalette({selected},dark);
      assert.deepEqual(p,preset[dark?"dark":"light"]);
      for(const [key] of ROLES)assert.match(p[key],/^#[0-9a-f]{6}$/i);
      assert.ok(contrastRatio(p.text,p.background)>=4.5);
    }
  }
});
test("custom palettes retain independent light and dark colours",()=>{
  const a={selected:"custom-one",custom:[{id:"custom-one",name:"Test",dark:{background:"#112233"},light:{background:"#F0F0F0"}}]};
  assert.equal(resolvePalette(a,true).background,"#112233");
  assert.equal(resolvePalette(a,false).background,"#F0F0F0");
  assert.equal(resolvePalette(a,true).accent,PRESETS.botanical.dark.accent);
  assert.deepEqual(normalizeAppearance(JSON.parse(JSON.stringify(normalizeAppearance(a)))),normalizeAppearance(a));
});
test("invalid colours and unknown palette selections fall back safely",()=>{
  assert.equal(normalizeAppearance({selected:"__proto__",custom:[null,{}]}).selected,"legacy");
  const a={selected:"custom-x",custom:[{id:"custom-x",name:"",dark:{background:"url(evil)"}}]};
  assert.equal(resolvePalette(a,true).background,PRESETS.botanical.dark.background);
  assert.equal(normalizeAppearance(a).custom[0].name,"Custom palette");
});
test("contrast chooses legible text for light and dark blocks",()=>{
  assert.equal(onColour("#FFFFFF"),"#101820");
  assert.equal(onColour("#000000"),"#FFFFFF");
  assert.equal(contrastRatio("#000000","#FFFFFF"),21);
});
