Good2Go Admin Auto-Refresh Bookings + Feed
Generated: 2025-08-26T00:30:15.798045Z

Adds:
- app/api/admin/bookings-feed/route.ts
- app/admin/bookings/page.tsx   (client auto-refresh version)

Security:
- Both expect ADMIN_TOKEN; pass as ?token=YOUR_ADMIN_TOKEN or header x-admin-token.

How it works:
- Feed endpoint returns latest N (limit up to 10,000) from /bookings ordered by createdAt desc
- Admin page uses SWR to refresh every 15s and on window focus
