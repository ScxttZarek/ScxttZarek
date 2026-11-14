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

## Phase 3 — Chat scrolling / stale request hardening

- Chat auto-scrolls only while the user is already near the newest messages, or after explicitly sending a message.
- Polling requests use a monotonically increasing request identifier and server identity check, preventing stale responses from another selected server from overwriting the current chat.
- Clicking the already selected server no longer unnecessarily resets chat data or disconnects an active call.
- No backend, database or LiveKit source changes are included in this commit.

## Phase 4 — Connection-state UI and browser capture capability

- Voice status now reads the actual LiveKit room connection state instead of always showing the participant count as connected.
- The screen-share action checks whether the browser provides `getDisplayMedia` before attempting to start capture, and shows a Portuguese explanation otherwise.
- The existing broadcaster/viewer and control dock behavior remain unchanged.
- Real-device, two-session media regression tests are **not yet performed** and remain a release blocker for claiming full call stability.

## Phase 4 — Call theater and uncropped screen share

- The independent \`lc-call-*\` UI replaces the previous nested scrolling call view.
- LiveKit room/provider/call layout and stage explicitly fill the available vertical space, pinning controls to the bottom.
- Without an opened stream, participant cards are centered in the available stage.
- With a selected stream, the capture is the main panel and participants become a horizontal filmstrip.
- Shared desktops render with object-fit: contain, preserving the captured screen's full edges and aspect ratio.
- Watch/preview remains opt-in and the viewer retains fullscreen plus an expanded fallback.
- Backend, secrets, existing accounts and PostgreSQL schema are not changed.
- Build/typecheck and two-browser real capture tests must be independently documented; a successful build alone is not enough.

