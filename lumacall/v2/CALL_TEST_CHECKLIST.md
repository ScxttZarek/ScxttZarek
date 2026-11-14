# LumaCall 3.0 — Test checklist for call theater

## Layout
- With a single participant at 835×563, participant card is centered, not glued to the top, and controls remain at the bottom.
- With 2, 3 and 6 people, cards wrap without overlapping controls.
- With one screen viewer open, video fills all available vertical space above a horizontal participant strip.
- Captured desktop edges remain visible at 16:9, 16:10, 4:3 and ultrawide source resolutions (letterboxing is acceptable; cropping is not).
- Browser zoom 50, 75, 100, 125, 150 and 200%, desktop resolutions and mobile portrait/landscape.
- Scroll region never pushes controls below the viewport.

## Real media
- Two browser sessions, separate test accounts and a server already created for testing.
- Permission accepted, denied and cancelled.
- Start/stop sharing in site and via browser native sharing indicator.
- View stream only after selecting "Assistir transmissão".
- Local "Ver prévia", browser fullscreen, Esc, expanded fallback, close without stopping stream.
- Switch back to general chat without ending the voice call.
- Network interruption and reconnection; verify no duplicate microphone audio.
- Mobile device support is capability-dependent; do not report unsupported screen capture as passed.

## Deployment policy
- Preview builds are allowed on the test branch.
- Do not delete/change real data.
- Publish to production only after validating smoke tests and explicit release approval.
- Record test gaps honestly.
