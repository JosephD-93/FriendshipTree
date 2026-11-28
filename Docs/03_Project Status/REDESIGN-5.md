# FriendshipTree 5 redesign

Design discussion agreed on 28 November 2026. Navigation and settings are provisional and may be revisited after device testing. This is a staged redesign, not a rewrite or storage migration.

## Stage 1 — appearance foundation (implemented on this branch)
- Semantic background, frame, surface, grid/border, primary text, secondary text, accent and activity colours.
- Botanical, Nordic, Pastel, Jewel, Earth, Vibrant, paired light/dark variants.
- Named custom palettes, live preview beside labelled swatches, colour pickers, contrast warning.
- Opt-in: current appearance remains default. New tokens first apply to the Overall Overview page; the planner preview is illustrative. Legacy person-window theme remains available.
- Saved as an additional field in existing ft_settings. No changes to relationship, photo, diary, calendar or activity formats. Verify backup/restore and persistence across restart before rollout.
- Build tests cover resolution, fallbacks, contrast, and custom light/dark palette persistence representation.

## Agreed design
- Balanced, Fitbit-inspired visual identity: continuous surfaces, restrained planning, selective visual punch for health and progress. Keep existing dimensions, scoring and semantic relationship colours. Per-page intensity to be developed later.
- Planner: Google Calendar-inspired shaping and continuous vertical 24-hour timeline, upright activity blocks and time on the left in both orientations; drag/resize retained. Custom category colours and names. Tablet can show supporting panes.
- Gallery: continuous close-packed mosaic; round only outer corners of each collection. Standard/wide/tall/featured image sizes; long-press to adjust, rearrange without modifying original photo or losing tags. Adaptive column count. Accessible close and Android Back in viewers.
- Profiles: Instagram-inspired composition, retain profile picture ring, friendship tier/points/progress, birthday/countdown, notes, SMS/WhatsApp/Messenger/Instagram, interaction logging/history, flower, tags, contacts, connections/groups and photo functions. Phone portrait single scrolling page; landscape and wider screens use adaptive panes. Preserve selections and scroll on resize/rotation. Keep existing group and Me-specific functions.
- Map: preserve flowers, vines, map/stack/branch modes and meaningful colours, cleaner controls, optional effects and simple mode. No radial line changes to relationship map itself.
- Life balance: nine dimensions (Social, Health, Mind, Knowledge, Creativity, Growth, Purpose, Rest, Security). Six equal visual bands from centre outward: Very Low, Low, Good, Great, High, Very High. No spokes. Faint boundaries. Gradient confined to Good and Great, zero opacity at Low/Good and Great/High boundaries, strongest exactly at Good/Great boundary. Continuous endpoint position; no snapping; no individual numerical scores. Neutral thin polygon, gold overall number alone at centre, no star or label.
- Latest five symbol sketches supersede all earlier symbols: Very Low = open ring at top with central protruding exclamation; Low = two thin concentric outlines; Good and Great = outer thin outline with smaller filled central circle and wide gap; High = outer outline with nearly full inner disc and narrow gap; Very High = solid circle with protruding exclamation outline and negative-space exclamation. No star, plus, or other mark. Dimension colour applied consistently. Distinguish Good and Great via radial position only. Exact tier thresholds and score calculation not agreed: do not invent or change live scoring as part of visual redesign. Existing weekly reset and missing automatic updates require separate review.
- Health: dashboard first, manual Daily Dozen and habits where useful. External fitness apps and future own app may supply data; do not duplicate records or fabricate data. Retain existing tracking and imports. Dashboard widgets eventually resize/rearrange.
- Navigation/settings (provisional): phone bottom navigation, tablet optional side rail, customisable ordering and visibility, grouped searchable settings; keep all existing actions accessible.

## Rollout
1. Appearance foundation: verify browser build, tests, persistence, dark/light, accessibility.
2. Balance wheel: implement exact SVG markers and gradient; separate review of real score mapping, thresholds, weekly reset, missing data and excessive activity. Never change user's actual scores silently.
3. Responsive planner; then gallery/profile; then map controls and health; finally navigation/settings. Small PRs and device checks, not a giant replacement.
4. Test phone/tablet portrait/landscape, split screen, accessibility, data backup/restore, existing interactions, cold start and resume.
5. Keep photo viewer stability work (PR #63) separate; integrate before release. Do not distribute branch APKs. Version bump and verified trusted signing on main required before any installable release.
