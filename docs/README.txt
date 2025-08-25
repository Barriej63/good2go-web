Good2Go Firebase Key Handling Patch
Generated: 2025-08-25T19:52:11.874516Z

Files:
- lib/firebaseAdminFallback.ts  (tolerates both multi-line PEM and \n-escaped single line)
- app/api/debug/admin/route.ts  (diagnostic endpoint)

Deploy:
1) Unzip at repo root (overwrite existing files).
2) Redeploy on Vercel.
3) Test /api/debug/admin and /api/debug/firestore.

