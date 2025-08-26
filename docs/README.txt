Good2Go Bundle Patch — Worldline Return (GET+POST) + Admin Bookings (no SWR)
Generated: 2025-08-26T01:17:14.292770Z

Includes:
- app/api/worldline/return/route.ts
  * GET + POST support
  * Firestore writes to payments and bookings
  * SendGrid email confirmation
  * ?debug=1 returns JSON; otherwise redirects to /success?ref=...

- app/admin/bookings/page.tsx
  * Auto-refresh bookings table every 15s (no SWR) with Last updated timestamp
  * Works with ADMIN_TOKEN-protected feed

Deploy:
1) Unzip at repo root (replaces the two files).
2) Commit + deploy to Vercel.
