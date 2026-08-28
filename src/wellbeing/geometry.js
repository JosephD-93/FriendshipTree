import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";

export const DOMAIN_ANGLES=Object.freeze({mind:-Math.PI/2,body:Math.PI/6,soul:5*Math.PI/6});
const TAU=Math.PI*2;
const wrap=a=>{while(a<=-Math.PI)a+=TAU;while(a>Math.PI)a-=TAU;return a};
const circularMean=angles=>Math.atan2(angles.reduce((s,a)=>s+Math.sin(a),0),angles.reduce((s,a)=>s+Math.cos(a),0));

export const getNodeAngle=node=>circularMean([node.primaryDomain,...(node.secondaryDomains||[])].map(id=>DOMAIN_ANGLES[id]).filter(Number.isFinite));
export const getEcosystemLayout=()=>({domains:WELLBEING_DOMAINS.map(d=>({...d,angle:DOMAIN_ANGLES[d.id]})),nodes:WELLBEING_NODES.map((n,i)=>({...n,angle:getNodeAngle(n),orbit:1+(i%3)*.12}))});

// Stack is a projection of the circular ecosystem. Keep the visible window narrower
// than a full half-turn so the phone view does not try to show almost every node at once.
export const projectNodeToStack=(node,scrollAngle)=>{
 const influenceCount=1+(node.secondaryDomains?.length||0);
 const delta=wrap(getNodeAngle(node)-scrollAngle);
 const parallax=1/Math.sqrt(influenceCount);
 const edge=Math.PI*.64;
 const proximity=Math.max(0,1-Math.abs(delta)/edge);
 return{delta,x:delta*parallax,parallax,proximity,visible:Math.abs(delta)<edge};
};
