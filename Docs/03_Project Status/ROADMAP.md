# Roadmap

## Immediate priority

Prove the Forge update path end to end with one harmless valid package placed in:

`StudioSystem\Updates\Inbox`

Success means:

- Forge detects it;
- validation succeeds;
- it installs as a candidate version;
- Studio launches;
- confirmation works;
- rollback remains available.

No further updater architecture work should begin until this test passes.

## Project consolidation

1. install the canonical documentation in `Docs`;
2. preserve old outputs in `Generated Builds`;
3. keep active scripts in `Scripts`;
4. identify the exact source-of-truth roles of `FriendshipTreeStudio`, `StudioSystem` and `Tools`;
5. create a current file manifest;
6. package only the necessary context for future conversations.

## App priorities already discussed

- reliable automatic local backups;
- Google Drive backup strategy;
- restore photos as well as JSON data;
- multi-contact import and onboarding;
- Android home-screen health widget;
- daily-use mascot widget;
- camera navigation and nearby directional controls;
- fancy-map performance;
- continued health-list editing improvements.

These are not all confirmed implemented. Each must be checked against current source before work resumes.
