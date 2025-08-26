Good2Go Bundle Patch — Worldline Return (GET+POST) + Admin Bookings (no SWR)
Generated: 2025-08-26T00:50:10.044480Z

Includes:
- app/api/worldline/return/route.ts
  * GET + POST support
  * Firestore writes to payments and bookings
  * SendGrid email confirmation
  * ?debug=1 returns JSON; otherwise redirects to /success?ref=...

- app/admin/bookings/page.tsx
  * Auto-refresh bookings table every 15s without SWR dependency
  * Works with ADMIN_TOKEN-protected feed
