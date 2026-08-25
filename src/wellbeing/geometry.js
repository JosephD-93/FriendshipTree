import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";

export const DOMAIN_ANGLES=Object.freeze({mind:-Math.PI/2,body:Math.PI/6,soul:5*Math.PI/6});
const TAU=Math.PI*2;
const wrap=a=>{while(a<=-Math.PI)a+=TAU;while(a>Math.PI)a-=TAU;return a};
const circularMean=angles=>Math.atan2(angles.reduce((s,a)=>s+Math.sin(a),0),angles.reduce((s,a)=>s+Math.cos(a),0));

export const getNodeAngle=node=>circularMean([node.primaryDomain,...(node.secondaryDomains||[])].map(id=>DOMAIN_ANGLES[id]).filter(Number.isFinite));
export const getEcosystemLayout=()=>({domains:WELLBEING_DOMAINS.map(d=>({...d,angle:DOMAIN_ANGLES[d.id]})),nodes:WELLBEING_NODES.map((n,i)=>({...n,angle:getNodeAngle(n),orbit:1+(i%3)*.12}))});

// Stack is not a second layout: it is a projection of the circular ecosystem.
// Shared nodes are weighted toward the viewport because their circular mean lies
// between parent domains; a small parallax factor makes multi-domain nodes drift
// more slowly while scrolling between sections.
export const projectNodeToStack=(node,scrollAngle)=>{
 const influenceCount=1+(node.secondaryDomains?.length||0);
 const delta=wrap(getNodeAngle(node)-scrollAngle);
 const parallax=1/Math.sqrt(influenceCount);
 return{delta,x:delta*parallax,parallax,visible:Math.abs(delta)<Math.PI*.82};
};
