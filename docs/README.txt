Good2Go Admin Dashboard + Reconcile (ADMIN_TOKEN)
Generated: 2025-08-26T00:22:51.325189Z

Files:
- app/api/admin/reconcile/route.ts   (reconcile bookings by doc ID + ref, secured with ADMIN_TOKEN)
- app/admin/bookings/page.tsx        (simple admin page listing bookings + reconcile form)

Security:
- Set ADMIN_TOKEN in Vercel env vars
- Access /api/admin/reconcile?booking=<id>&ref=<ref>&token=ADMIN_TOKEN
- Access /admin/bookings?token=ADMIN_TOKEN

Note: This variant uses ADMIN_TOKEN (not Basic Auth).
