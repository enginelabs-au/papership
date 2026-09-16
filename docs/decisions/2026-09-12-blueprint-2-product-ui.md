# Decision D-21: Product UI is blueprint-2 exactly

## Status

`accepted` — owner-directed 2026-09-12. Supersedes the D-20 **hybrid chrome** clause and D-15 observatory chrome for the live web product.

## Decision

1. The live Papership web UI is a faithful port of `docs/ui-blueprint/blueprint-2/` (`OrgOS.dc.html` is canonical). Do not keep a hybrid of blueprint-1 `/cc-org-dash` chrome and blueprint-2.
2. Exact chrome: cream canvas `#faf8f4`, purple nav field `#6d28d9`, Inter + JetBrains Mono, light / dark / dimmed via `[data-theme]`, 60px top bar with centered search + ⌘K, notched primary tabs on the purple field, 264px Company rail, **docked 420px Hey Papership** (not an overlay), 32px status bar, invitation-only auth with no Google.
3. Today is compose + Mode chips + allowance, system health, priorities, required decisions, and running work — not the blueprint-1 Home charts or “Finish setup” strip.
4. Fixture copy comes from the mock (including allowance 184 and run ids). No invented revenue or prices. Product name stays Papership (D-20). Engine Labs and live slugs are unchanged.
5. The mobile HTML (`OrgOS Mobile.dc.html`) is Release 4 compressed chrome (bottom tabs). Owner asked 2026-09-12 to ship that compressed chrome on the live web surface at `max-width: 767px`. Desktop at wider viewports stays docked 420px Hey Papership, notched tabs, and the 264px rail.
6. The prism-head mark is the **app icon and browser tab icon only**. Do not render it inside the product UI (top bar, auth, compose, Hey Papership, or elsewhere).

## Consequences

- `/cc-org-dash` mounts `apps/web/src/blueprint2/App.jsx`. Unused blueprint-1 components remain under `apps/web/src/components/cc-org-dash/` until a later cleanup.
- Desktop Tauri chrome is not this port unless separately asked.
- D-15 sun/moon-only and overlay Hey Papership no longer describe the web product.
