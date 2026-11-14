# LumaCall 3.0 — Baseline Audit / Phase 0

Baseline main commit: `b3c0216cf2818579f8c12b9b8523f60f48f0cc4a`

## Current architecture

- Next.js App Router, React, TypeScript
- LiveKit for voice, camera, screen sharing and participant connection
- Neon PostgreSQL: users, sessions, servers, membership and messages
- V2 source under `lumacall/v2/`, copied into generated app during `preinstall`
- `source.part*.b64` archive and sequential patches construct legacy source, followed by `v2-bootstrap-preview.js` and `v2-enable-home.js`
- V2 homepage, optional screen-share viewer, local preview, Fullscreen API and PWA install UI are already present

## Verified data baseline (read-only)

At audit time: 9 users, 4 servers, 5 messages. No data mutation is authorized for visual phases.

## Identified risks

1. `nova-app.tsx` is a large component mixing navigation, authentication, chat, server and modal state.
2. `v2.css` includes multiple overlapping selectors and late-stage compatibility rules; avoid adding competing large overrides.
3. Message refreshing uses polling; assess stale response/race conditions and scroll behavior in dedicated chat phase.
4. LiveKit viewer and room lifecycle need two-session, real-media regression tests before claiming call reliability.
5. Browser resizing, low screen height and mobile drawer interactions must not conceal critical controls.
6. The generated Next.js source is overwritten by installer scripts; durable changes must be made in `v2/` and copied during bootstrap.

## Phase 2 UI shell polish

- Refined server navigation, sidebar, header controls and member row spacing using existing CSS selectors.
- Refined chat hover treatment and composer spacing without changing data flows.
- Kept LiveKit and its control-bar CSS untouched pending real-media regression tests.
- No new required dependencies, database changes or API changes.

## Phase 1 implementation scope

- Extract stateless brand/avatar/badge UI to `v2/ui-kit.tsx`.
- Extract server navigation rail, topbar and member list into `v2/shell-parts.tsx` using callback props, preserving existing app state.
- Formalize the foundation theme tokens at the existing CSS root, apply tokens to core navigation.
- Resolve small-screen navigation backdrop and missing layout min-size constraints.
- Improve accessible names/keyboard focus without modifying any API or database code.

## Not included in this phase

- No database schema or record changes
- No authentication policy changes
- No LiveKit/API changes
- No new channels, roles, messages or fake controls
- No production deployment
- No claim that live screen capture is tested until real sessions are exercised

## Follow-up phases

- Phase 2: responsive application shell, navigation and layout visual regression tests
- Phase 3: chat scrolling and composer validation
- Phase 4: LiveKit state, screen-sharing and participant UI hardening with real browser sessions
- Phase 5: media performance, reconnection and long-session regression testing

## Test and rollback protocol

Use a non-production preview deployment. Confirm Next.js and TypeScript build logs, run UI smoke tests as available, log any untested behavior. Roll back by reverting the preview branch commit; the production main branch stays unchanged until separately approved.
