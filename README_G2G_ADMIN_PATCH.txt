Good2Go Admin UI Patch (route-grouped dashboard + standalone login)
==================================================================
This patch ONLY adds/changes admin chrome and the public header.
It does NOT touch booking/payment logic or API handlers.

WHAT THIS PATCH DOES
--------------------
1) Adds a route-group: app/admin/(dashboard) so the sidebar/header
   only apply to dashboard pages, not /admin/login.
2) Makes /admin/login a simple standalone page that redirects to
   /admin if you are already signed-in.
3) Adds a gradient public header with real buttons (hidden on admin).

FILES ADDED
-----------
  app/layout.tsx
  components/SiteHeader.jsx
  app/admin/(dashboard)/layout.tsx
  app/admin/login/layout.tsx
  app/admin/login/page.tsx
  app/admin/login/ui/LoginForm.tsx
  components/admin/Sidebar.tsx
  components/admin/LogoutButton.tsx

IMPORTANT: REMOVE OLD DUPLICATES
--------------------------------
Delete these old files if they exist to avoid double layouts:
  - app/admin/layout.tsx   (the old dashboard layout at root)
  - app/layout.jsx         (keep ONLY app/layout.tsx)

MOVE (or DELETE) OLD DASHBOARD PAGES
------------------------------------
If you currently have these at app/admin/... move them into the
new route-group folder app/admin/(dashboard)/...  Example:
  OLD: app/admin/page.tsx        -> NEW: app/admin/(dashboard)/page.tsx
  OLD: app/admin/bookings/page.tsx -> NEW: app/admin/(dashboard)/bookings/page.tsx
  OLD: app/admin/config/page.tsx   -> NEW: app/admin/(dashboard)/config/page.tsx
  OLD: app/admin/users/page.tsx    -> NEW: app/admin/(dashboard)/users/page.tsx

If you prefer not to move them right now, you can leave them where
they are and simply create placeholder pages under the new folder
that re-export the old ones (advanced). The cleanest approach is to
move them once.

AFTER INSTALL
-------------
  - /admin/login shows a clean card without sidebar/header.
  - If already signed in, /admin/login redirects to /admin.
  - /admin/* pages show dark sidebar + green header.
  - Public pages show the gradient blue header with two buttons.

This patch does not change booking or payment flow.
