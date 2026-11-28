import {test} from "node:test";
import assert from "node:assert/strict";
import {BAND_NAMES,DIMENSIONS,BOUNDARIES,locate,gradientOpacity,EXAMPLE_POSITIONS} from "./balanceGeometry.js";
test("six bands and nine dimensions with all example positions",()=>{
  assert.equal(BAND_NAMES.length,6);assert.equal(DIMENSIONS.length,9);
  for(const [key] of DIMENSIONS)assert.ok(Number.isFinite(EXAMPLE_POSITIONS[key]));
});
test("continuous radii without snapping",()=>{
  for(let tier=0;tier<6;tier++){const a=locate(tier+.1,0),b=locate(tier+.7,0);assert.equal(a.tier,tier);assert.equal(b.tier,tier);assert.ok(b.radius>a.radius);}
  assert.equal(locate(6,0).tier,5);assert.equal(locate(3,0).radius,BOUNDARIES[3]);
});
test("gradient is zero outside Good and Great and peaks at boundary",()=>{
  assert.equal(gradientOpacity(BOUNDARIES[2]),0);
  assert.equal(gradientOpacity(BOUNDARIES[3]),1);
  assert.equal(gradientOpacity(BOUNDARIES[4]),0);
  for(let i=0;i<=22;i++)assert.ok(Math.abs(gradientOpacity(BOUNDARIES[3]-i)-gradientOpacity(BOUNDARIES[3]+i))<1e-12);
  assert.equal(gradientOpacity(48),0);assert.equal(gradientOpacity(136),0);
});
test("missing and invalid data never becomes a fabricated score",()=>{
  for(const invalid of [undefined,null,NaN,Infinity,-1,7,"3"])assert.equal(locate(invalid,0),null);
});
