# Good2Go polish pack (0823)

Included:
- Server-rendered **/success** page that loads Firestore by `bid` (or `ref`) and displays booking details.
- **Add to Calendar** button via `/api/ics?bid=...` (RFC 5545 .ics builder in `lib/ics.js`).
- **Print receipt** page at `/success/receipt?bid=...` with @media print styles.
- Minimal **/cancel** page for abandoned/failed payments.
- Re-usable `<SuccessDetails/>` component.

## Install
Copy the files into your Next.js app (App Router). Requires `lib/firebaseAdmin.js` with `getAdminDb()` which returns a Firestore Admin instance (already present in your repo).

## Notes
- The /success page accepts either `?bid=...` or `?ref=...` to be tolerant of previous query names.
- The ICS event defaults to 60 minutes if `durationMinutes` is not set on the booking.
- Amount expects `cents` if you follow typical gateway conventions.

## Housekeeping
- Keep `BUILD_STATUS.md`.
- It's safe to delete the helper folders at repo root: `g2g-success-*`, `g2g-worldline-*`.
