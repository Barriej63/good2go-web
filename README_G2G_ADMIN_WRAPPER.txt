Good2Go Admin UI WRAPPER (no-move version)
=========================================
This package applies the new admin chrome (sidebar + green header)
WITHOUT moving your existing admin pages.

What it adds
------------
- app/admin/(dashboard)/layout.tsx       (the new dashboard layout)
- app/admin/(dashboard)/page.tsx         (re-exports ../page)
- app/admin/(dashboard)/bookings/page.tsx (re-exports ../../bookings/page)
- app/admin/(dashboard)/config/page.tsx   (re-exports ../../config/page)
- app/admin/(dashboard)/users/page.tsx    (re-exports ../../users/page)

How it works
------------
Next.js route groups let us wrap your current pages with a new layout.
Each file here simply re-exports your original page, so your data and
handlers are untouched.

If you don't have one of the pages (e.g. users), just delete the
corresponding re-export file after unzipping to avoid build errors.

Requirements
------------
- Keep the earlier files installed:
  * components/admin/Sidebar.tsx
  * components/admin/LogoutButton.tsx
  * app/admin/login/... (standalone login)
  * app/layout.tsx and components/SiteHeader.jsx
- Delete old app/admin/layout.tsx (root) if still present, so the new
  route-group layout becomes the only admin layout.

After installing
----------------
- /admin/login remains a simple card (no sidebar).
- /admin and its tabs render with the dark sidebar + green header.
- Booking and payment flows are unchanged.
