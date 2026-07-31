# FriendshipTree Project Constitution

**Status:** Permanent governing context for humans and AI assistants  
**Applies to:** FriendshipTree app, FriendshipTree Studio, Electron Launcher, Forge, and the AI Knowledge System  
**Authority:** This document defines project intent and responsibility boundaries. Exact current source remains the final authority for implementation details.

---

## 1. Purpose

FriendshipTree is a personal relationship, wellbeing and life-management system centred on a visual social graph.

The project exists to help the user:

- remember and maintain relationships;
- understand people, groups and connections;
- record health and daily activity;
- preserve personal data reliably;
- use a visually rich, calm and useful Android application;
- develop and maintain the system safely without losing working versions.

Development should favour usefulness, reliability, clarity and recoverability over novelty.

---

## 2. Governing principle

No AI, developer tool or subsystem may invent paths, APIs, workflows, package formats or system responsibilities.

Before changing anything:

1. inspect the exact current source;
2. identify the canonical file;
3. understand how the affected systems communicate;
4. identify the supported build and delivery path;
5. preserve a rollback route;
6. distinguish confirmed behaviour from intended or historical behaviour.

When documentation and source conflict, current source wins for implementation facts. The conflict must then be recorded and the documentation corrected.

---

## 3. System boundaries

### FriendshipTree app

The app is the user-facing product.

It owns:

- the social graph;
- people and groups;
- photos and personal records;
- health and daily tracking;
- map views, navigation and visual systems;
- user data persistence;
- Android behaviour;
- backup, import and export features intended for the end user.

It must not:

- manage Studio versions;
- replace Forge;
- act as a developer-tool launcher;
- silently risk user data for visual or architectural convenience.

### FriendshipTree Studio

Studio is the developer environment for building, inspecting, testing and maintaining FriendshipTree.

It may own:

- source inspection and organisation;
- web builds;
- Capacitor synchronisation;
- Android builds;
- APK installation and deployment;
- project diagnostics;
- recovery points;
- controlled project maintenance;
- AI context and development exports;
- explicitly documented non-Studio project packages.

It must not:

- bypass Forge for Studio self-updates;
- overwrite a confirmed Studio version in place;
- create a competing canonical Studio version state;
- claim a workflow is safe without testing or rollback evidence.

### Electron Launcher

The Launcher is the normal dashboard and entry point.

It may:

- show project and Studio status;
- read Forge-managed version state;
- launch an installed Studio version;
- open Forge;
- open project, documentation, logs, update and version folders;
- operate the AI Knowledge System;
- create AI workspace exports.

It must not:

- independently install, confirm or roll back Studio versions;
- duplicate Forge’s safety contract;
- create a second version authority;
- hide warnings about inconsistent state.

### Forge

Forge is the trusted Studio version lifecycle manager.

It owns:

- Studio update-package validation;
- package staging;
- checksum and required-file verification;
- installation beside existing versions;
- candidate status;
- candidate launch;
- confirmation;
- last-known-good retention;
- failed-version tracking;
- rollback;
- canonical installed Studio version state.

No other system may install or replace Studio versions unless this constitution is deliberately revised and the replacement preserves equivalent or stronger safety guarantees.

### AI Knowledge System

The AI Knowledge System exists to transfer accurate project understanding into future conversations.

It owns:

- canonical AI context documents;
- source indexing;
- workspace validation;
- export snapshots;
- requested-file exports;
- instructions for future AI sessions.

It does not make source code authoritative merely by describing it. Its summaries must remain grounded in exact source and clearly label uncertainty.

---

## 4. Canonical authority order

Use this order when sources disagree:

1. Exact current implementation source.
2. This `PROJECT_CONSTITUTION.md`.
3. `AI_SPECIFICATION.md`.
4. `MANIFEST.json`.
5. `ARCHITECTURE.md`.
6. `DEVELOPMENT_RULES.md`.
7. `CURRENT_STATE.md`.
8. `KNOWN_ISSUES.md`.
9. `NEXT_TASKS.md`.
10. `CHANGELOG.md`.
11. Current structured project documentation.
12. Historical documentation, installers, reports, handovers and chat summaries.

Generated builds and exported ZIP files are snapshots, not permanent canonical sources.

A lower-authority document may explain history, but it must not override newer source or this constitution.

---

## 5. Canonical-location rules

There must be one documented canonical location for each living concern.

At minimum:

- one canonical app source;
- one editable Studio source;
- one canonical Forge source;
- one canonical Launcher source;
- one canonical Studio version state;
- one canonical documentation root;
- one canonical AI knowledge root;
- one package contract per package purpose.

Duplicate live authorities are defects.

Historical copies must be clearly marked as historical, archived or excluded from authority.

---

## 6. Version rules

The project must distinguish:

- app version;
- editable Studio source version;
- installed current Studio version;
- pending Studio candidate;
- previous Studio version;
- last confirmed working Studio version;
- Forge version;
- Launcher version;
- AI export generation time.

These values must not be treated as interchangeable.

Forge’s canonical state is authoritative for installed Studio lifecycle status.

A pending version must be confirmed or rolled back through the supported Forge workflow. It must not be resolved by casually editing state JSON.

Conflicting state files must be removed, archived or explicitly marked non-canonical.

---

## 7. Update and package rules

The `.ftupdate` extension must not silently represent incompatible package contracts.

Every package type must define:

- owner;
- purpose;
- extension or unambiguous type identifier;
- manifest schema;
- inbox;
- validation rules;
- installation destination;
- rollback behaviour;
- logging;
- failure handling.

Studio self-updates belong to Forge.

If Studio retains a project-package installer, it must reject Studio self-update packages and use a clearly documented contract that cannot be confused with Forge’s Studio package format.

---

## 8. Build and delivery rules

These are separate workflows and must be documented separately:

### App web build

Vite produces the web bundle.

### Android synchronisation

Capacitor synchronises the web build and native Android project.

### Android build

Gradle produces the APK or Android build artefact.

### Android installation

ADB or another documented installation route installs the build on a device.

### App release or OTA delivery

Any app update delivery mechanism must be documented independently from Studio updates.

### Studio update

Forge validates, installs, launches, confirms and rolls back Studio versions.

### AI export

The AI Knowledge System creates a transport snapshot for a future AI session. It is not an installer and not a source replacement.

A tool must use the correct workflow for the artefact being changed.

---

## 9. Data-safety rules

User data reliability is a core product requirement.

Changes affecting storage, import, export, photos, backup or restore must answer:

- where the data is stored;
- when it is written;
- how write success is confirmed;
- what survives app closure;
- what survives app update;
- what survives uninstall;
- how photos are included;
- how restoration is tested;
- how failures are shown to the user.

No persistence feature is considered complete merely because a success message appears.

It must be tested against the physical Android device and the real lifecycle being claimed.

---

## 10. Change rules

Before implementation:

- inspect exact source;
- state the problem;
- identify affected systems;
- identify canonical files;
- describe the intended result;
- identify risks;
- create a backup or recovery point;
- define acceptance tests.

During implementation:

- make the smallest coherent change;
- preserve working behaviour;
- avoid parallel replacement systems;
- avoid guessed paths and hard-coded assumptions where canonical configuration exists;
- record architectural decisions.

After implementation:

- run syntax and structural checks;
- run relevant behavioural tests;
- verify rollback;
- update canonical documentation;
- update current state, known issues, next tasks and changelog;
- regenerate and validate the AI export;
- label anything not tested as `NOT VERIFIED`.

---

## 11. Validation rules

A structural pass does not prove architectural health.

Validation must distinguish:

- `PASS`
- `WARNING`
- `ERROR`
- `NOT VERIFIED`

Validation should check:

- required file presence;
- version-state consistency;
- canonical-path consistency;
- package ownership;
- duplicate update engines;
- incompatible schemas;
- documentation authority;
- Launcher and preload IPC matching;
- supported build paths;
- export completeness;
- stale or competing state files.

`PASS` must never be used to imply runtime behaviour that was not tested.

---

## 12. Documentation rules

Living documentation must be concise, current and non-duplicated.

Every future AI must be able to determine:

- what the systems are;
- what each system owns;
- how they communicate;
- which files are canonical;
- how builds and updates are delivered;
- the current confirmed state;
- known issues;
- next tasks;
- unresolved contradictions;
- what has not been verified.

Historical documents must remain available when useful but clearly marked as historical and superseded.

---

## 13. AI working rules

A future AI must:

1. read this constitution first;
2. read the manifest-defined canonical documents;
3. inspect relevant exact source before proposing changes;
4. treat generated summaries as guidance, not proof;
5. quote exact file paths when making architectural claims;
6. state uncertainty;
7. avoid presenting old backlog items as current defects;
8. avoid proposing a new subsystem before understanding the existing one;
9. preserve the established safe delivery route;
10. update the knowledge system after meaningful work.

An AI must not claim that it contacted, instructed or changed Studio, Launcher, Forge or the user’s computer unless it actually used an available connected tool that performed that action.

---

## 14. Current architectural decisions

Unless deliberately superseded after source review:

- The app is the product.
- Studio is the development environment.
- Launcher is the everyday dashboard.
- Forge is the sole Studio version lifecycle authority.
- The AI Knowledge System transfers accurate project context.
- Exact source is the implementation authority.
- Duplicate live systems must be consolidated rather than allowed to drift.
- Recoverability is more important than rapid unverified installation.
- Data persistence must be proven on the real Android lifecycle.
- A successful export does not prove a healthy architecture.
- A successful validation does not prove untested runtime behaviour.

---

## 15. Definition of completion

A change is complete only when:

- the intended behaviour exists;
- the correct system owns it;
- exact files are known;
- relevant tests pass;
- rollback remains available;
- documentation matches source;
- current state is updated;
- known issues and next tasks are updated;
- the AI workspace has been refreshed;
- future AI sessions can understand the result without relying on chat history.

---

## 16. Amendment rule

This constitution may be changed when the project genuinely evolves.

Any amendment must include:

- the reason;
- affected responsibility boundaries;
- exact source evidence;
- migration impact;
- compatibility and rollback considerations;
- an entry in the canonical changelog.

Silent architectural drift is not an amendment.
