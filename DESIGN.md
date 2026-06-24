# Travel Desk — Design System ("From the window seat")

Source: Claude design project `c51ba629-a8b6-47a7-957e-993b06cad92e` (screens: Login, Dashboard, NewRequest, MyTrips, Events, Settings, DesignSystem). Those `.dc.html` files are Claude-design preview format (x-dc/DCLogic) — the real implementation lives in `frontend/src` as React. This doc is the token reference.

## Fonts (Google Fonts)
- **Newsreader** (weight 300, letter-spacing -.015em) — display / page titles ("Where are we headed?").
- **Hanken Grotesk** (400/500/600/700) — all UI / body.
- **DM Mono** (400/500, uppercase, tracked .14–.22em) — eyebrows, field labels, boarding-pass details.

## Color
**Surfaces (warm, never stark):** Sand `#EFE8DB` (app backdrop) · Canvas `#F3ECDF` (main area) · Linen `#FBF7F0` (sidebar) · White `#FFFFFF` (cards) · Shell `#FAF6EF` (inset panels).
**Ink:** `#2C281F` (text) · Muted `#7A7264` · Faint `#9A9082` · Placeholder `#B0A695` · Hairline `rgba(44,40,31,.08)`.
**Accents:** Sky blue `#2F6F99` (primary/CTAs/links; hover `#285F84`; tint `#E7F0F6`) · Sunrise gold `#D99A4E` (highlights/active marks; deep `#B07A2E`; tint `#F6EAD6`).
**Login sky gradient:** `linear-gradient(180deg,#8FC6E6,#AAD6EC 30%,#CFE7F2 55%,#E9F1ED 78%,#F8E7D1)`.

## Status colors (bg / fg / dot)
- Awaiting Response — `#E7F0F6` / `#2F6F99` / `#2F6F99`
- Need More Information — `#F6EAD6` / `#B07A2E` / `#D99A4E`
- Approved — `#E6F0E4` / `#4E7A52` / `#6E9E72`
- Not Approved — `#F3E7E1` / `#A8694E` / `#B0795C`

## Radius / shadow / motion
- Radius: field 9–10px · button 11px · card 16px · pill 20px.
- Shadow: card `0 1px 2px rgba(40,33,24,.04)` · raised `0 14px 30px -20px rgba(40,33,24,.45)`.
- Motion: subtle, eased (`cubic-bezier(.42,0,.2,1)`), ~140–1400ms. Honor `prefers-reduced-motion`.

## Signature components
- **Diamond mark:** 11px gold square rotated 45° = the logo/active-nav dot.
- **Sidebar (252px, Linen):** logo + "SSV Labs · Travel", nav rows (rotated-square dot + label + optional count badge), footer = real user (initials avatar + name + email + role). NO "viewing as" role-switcher in the real app — role comes from `/api/auth/me`.
- **Login:** airplane cabin window over the sky gradient with drifting cloud blobs; a "boarding pass" card with the Google sign-in. On sign-in: a descent animation (sky scales up, clouds drift away + fade, whiteout → "Welcome aboard / Preparing your dashboard…") then redirect to OAuth. Reduced-motion = simple fade.
- **Dashboard:** search + filter pills (All/Awaiting/Need info/Approved/Not approved) + status sections of expandable request cards. Expanded card shows the per-day schedule (Day N · date · morning · evening), submitter notes, request details, and approver-notes textarea + Approve/Need-info/Decline (admins only).
- **NewRequest:** two-column — left form (Trip details: traveler typeahead, event select, derived read-only destination, Department/Cost Center/Budget selects + "budget is a category, not an amount" note; Travel dates with event-date FYI hint; Daily schedule: a row per day with Morning/Evening role selects; Notes) + right sticky Trip Summary (facts only, no money) with Submit + Save draft. Success state = "Bon voyage" card.
