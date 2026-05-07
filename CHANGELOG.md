# Changelog

## Unreleased

### Added
- Client-side device fingerprint collector (`lib/fingerprint.ts`) reading canvas, WebGL (UNMASKED_VENDOR/RENDERER), OfflineAudioContext, font probes via `document.fonts.check`, screen, timezone and UA. Hashed with SHA-256 and sent on review submit.
- Anonymous client cookie `vr_uid` (UUID, httpOnly, 1 year) issued by `/api/reviews` to track repeat submitters across IP changes.
- Fingerprint id badge (`#xxxxxxxx`, first 8 chars of `fpHash`) shown next to each review's author in the review list.
- `nextAllowedAt` field returned on 429 responses; `ReviewForm` shows a live cooldown ("you can review again in Xd Xh Xm").
- MongoDB indexes on `clientId` and `fpHash` (sparse).

### Changed
- Per-IP review limit lowered from 6 to **1 review per game**, with a sliding **4-day** reset window.
- Block check now matches on `ipHash` OR `clientId` OR `fpHash` (any layer triggers cooldown).
- `ReviewDoc` extended with optional `clientId` and `fpHash`; `ReviewView` now exposes `fpId` (8-char prefix).
