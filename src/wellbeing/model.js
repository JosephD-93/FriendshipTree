// FriendshipTree wellbeing model — Phase 1
//
// This file defines the vocabulary and relationships only. It deliberately does
// not diagnose health conditions or assign scores from raw observations yet.
// Views (Map, Stack and Overview) should consume this shared model rather than
// maintaining separate wellbeing taxonomies.

export const WELLBEING_STATES = Object.freeze([
  "dormant",
  "growing",
  "established",
  "flourishing",
  "overgrown",
]);

export const WELLBEING_STATE_LABELS = Object.freeze({
  dormant: "Dormant",
  growing: "Growing",
  established: "Established",
  flourishing: "Flourishing",
  overgrown: "Overgrown",
});

export const EVIDENCE_TYPES = Object.freeze({
  observed: "Observed",
  inferred: "Inferred",
  reported: "Reported",
});

export const OVERGROWN_REASONS = Object.freeze({
  dominance: "Dominating time or attention",
  deviation: "Sustained change from personal baseline",
});

const node = (id, label, primaryDomain, options = {}) => ({
  id,
  label,
  primaryDomain,
  secondaryDomains: [],
  links: [],
  evidence: [],
  supportsOvergrown: false,
  ...options,
});

export const WELLBEING_DOMAINS = Object.freeze([
  {
    id: "mind",
    label: "Mind",
    description: "Thinking, feeling, learning and psychological functioning.",
  },
  {
    id: "body",
    label: "Body",
    description: "Physical health, movement, energy, maintenance and recovery.",
  },
  {
    id: "soul",
    label: "Soul",
    description: "Relationships, belonging, meaning, enjoyment and connection.",
  },
]);

export const WELLBEING_NODES = Object.freeze([
  // Mind
  node("mental-wellbeing", "Mental wellbeing", "mind", {
    secondaryDomains: ["soul"],
    links: ["mental-recovery", "sleep", "relationships", "purpose"],
    evidence: ["reported"],
  }),
  node("mental-recovery", "Mental recovery", "mind", {
    secondaryDomains: ["body"],
    links: ["mental-wellbeing", "sleep", "recreation"],
    evidence: ["observed", "reported"],
    supportsOvergrown: true,
  }),
  node("learning", "Learning & knowledge", "mind", {
    secondaryDomains: ["soul"],
    links: ["curiosity", "mastery", "engagement"],
    evidence: ["observed", "reported"],
    supportsOvergrown: true,
  }),
  node("curiosity", "Curiosity", "mind", {
    links: ["learning", "creativity"],
    evidence: ["reported"],
  }),
  node("creativity", "Creativity", "mind", {
    secondaryDomains: ["soul"],
    links: ["curiosity", "engagement", "recreation"],
    evidence: ["observed", "reported"],
  }),
  node("focus", "Focus & attention", "mind", {
    links: ["engagement", "mental-recovery", "sleep"],
    evidence: ["reported"],
  }),
  node("engagement", "Engagement", "mind", {
    secondaryDomains: ["soul"],
    links: ["focus", "mastery", "purpose", "recreation"],
    evidence: ["observed", "reported"],
  }),
  node("mastery", "Achievement & mastery", "mind", {
    secondaryDomains: ["soul"],
    links: ["learning", "engagement", "purpose"],
    evidence: ["observed", "reported"],
    supportsOvergrown: true,
  }),

  // Body
  node("physical-health", "Physical health", "body", {
    secondaryDomains: ["mind", "soul"],
    links: ["movement", "nutrition", "sleep", "physical-recovery", "energy"],
    evidence: ["observed", "reported"],
  }),
  node("movement", "Movement & exercise", "body", {
    secondaryDomains: ["mind"],
    links: ["fitness", "physical-health", "energy", "mental-wellbeing", "recreation"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("fitness", "Fitness", "body", {
    links: ["movement", "physical-recovery", "energy"],
    evidence: ["observed", "inferred"],
    supportsOvergrown: true,
  }),
  node("nutrition", "Nutrition", "body", {
    secondaryDomains: ["mind"],
    links: ["physical-health", "energy"],
    evidence: ["observed", "reported"],
  }),
  node("sleep", "Sleep", "body", {
    secondaryDomains: ["mind"],
    links: ["physical-recovery", "mental-recovery", "focus", "mental-wellbeing", "energy"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("physical-recovery", "Physical recovery", "body", {
    secondaryDomains: ["mind"],
    links: ["sleep", "movement", "fitness", "energy"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("energy", "Energy", "body", {
    secondaryDomains: ["mind"],
    links: ["sleep", "nutrition", "physical-recovery", "engagement"],
    evidence: ["reported", "inferred"],
  }),

  // Soul
  node("relationships", "Relationships", "soul", {
    secondaryDomains: ["mind", "body"],
    links: ["friends", "family", "groups", "support", "belonging", "mental-wellbeing"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("friends", "Friends", "soul", {
    links: ["relationships", "support", "belonging", "social-diversity"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("family", "Family & intimacy", "soul", {
    secondaryDomains: ["mind"],
    links: ["relationships", "support", "belonging"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("groups", "Groups", "soul", {
    links: ["relationships", "community", "belonging", "social-diversity"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("community", "Community", "soul", {
    links: ["groups", "contribution", "belonging", "support"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("support", "Support", "soul", {
    secondaryDomains: ["mind"],
    links: ["relationships", "community", "belonging"],
    evidence: ["inferred", "reported"],
  }),
  node("belonging", "Belonging", "soul", {
    secondaryDomains: ["mind"],
    links: ["relationships", "groups", "community", "purpose"],
    evidence: ["reported"],
  }),
  node("social-diversity", "Social diversity", "soul", {
    links: ["friends", "groups", "community"],
    evidence: ["observed", "inferred"],
  }),
  node("purpose", "Meaning & purpose", "soul", {
    secondaryDomains: ["mind"],
    links: ["contribution", "belonging", "engagement", "mastery", "mental-wellbeing"],
    evidence: ["reported", "inferred"],
    supportsOvergrown: true,
  }),
  node("contribution", "Contribution", "soul", {
    secondaryDomains: ["mind"],
    links: ["purpose", "community", "belonging"],
    evidence: ["observed", "reported"],
    supportsOvergrown: true,
  }),
  node("recreation", "Recreation & play", "soul", {
    secondaryDomains: ["mind", "body"],
    links: ["mental-recovery", "movement", "creativity", "engagement", "relationships"],
    evidence: ["observed", "inferred", "reported"],
    supportsOvergrown: true,
  }),
  node("nature", "Nature & connection to place", "soul", {
    secondaryDomains: ["mind", "body"],
    links: ["recreation", "mental-recovery", "movement"],
    evidence: ["observed", "reported"],
  }),
]);

export const WELLBEING_NODE_BY_ID = Object.freeze(
  Object.fromEntries(WELLBEING_NODES.map((item) => [item.id, item]))
);

export const WELLBEING_NODES_BY_DOMAIN = Object.freeze(
  Object.fromEntries(
    WELLBEING_DOMAINS.map((domain) => [
      domain.id,
      WELLBEING_NODES.filter((item) => item.primaryDomain === domain.id),
    ])
  )
);

export const createEmptyWellbeingSnapshot = () => ({
  version: 1,
  updatedAt: null,
  domains: Object.fromEntries(
    WELLBEING_DOMAINS.map((domain) => [
      domain.id,
      { state: null, confidence: 0, trend: null },
    ])
  ),
  nodes: Object.fromEntries(
    WELLBEING_NODES.map((item) => [
      item.id,
      {
        state: null,
        confidence: 0,
        trend: null,
        overgrownReason: null,
        evidence: [],
      },
    ])
  ),
});

export const getWellbeingLinks = () => {
  const seen = new Set();
  const links = [];
  for (const item of WELLBEING_NODES) {
    for (const target of item.links) {
      if (!WELLBEING_NODE_BY_ID[target]) continue;
      const key = [item.id, target].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: item.id, target });
    }
  }
  return links;
};
