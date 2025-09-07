Good2Go Admin Config + Roles Kit
=================================
This kit adds:
  - Role-aware /api/admin/config (superadmin can save; others read-only)
  - A server wrapper that passes `canEdit` to your existing ConfigEditor
  - Non-destructive helpers for regions/venues/slots you can call from your UI

How to use
----------
1) Keep your existing adminAuth.ts (with hasRole/requireSuperadmin).
2) Replace app/api/admin/config/route.ts with the one in this kit.
3) Move your current big Config UI to:
     app/admin/(dashboard)/config/ui/ConfigEditor.tsx
4) Ensure app/admin/(dashboard)/config/page.tsx exists (from this kit).
5) In your ConfigEditor.tsx, accept the `canEdit` prop and disable editing for non-superadmins.
6) Use the helpers in ConfigEditor.helpers.ts to add/remove/update regions, venues, and slots.
