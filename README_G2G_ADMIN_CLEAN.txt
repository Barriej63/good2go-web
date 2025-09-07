G2G Admin UI CLEAN (fix duplicate-route build errors)
=====================================================
This package provides full dashboard pages INSIDE the route-group
`app/admin/(dashboard)/...` so you can delete the old originals that
were causing duplicate routes.

1) Unzip this into your repo root.
2) DELETE these old files if they exist:
     - app/admin/page.tsx
     - app/admin/bookings/page.tsx
     - app/admin/config/page.tsx
     - app/admin/users/page.tsx  (if you never had a users page, also delete
       app/admin/(dashboard)/users/page.tsx if present from the wrapper package)

3) Keep these (from the earlier patch):
     - app/admin/(dashboard)/layout.tsx
     - components/admin/Sidebar.tsx
     - components/admin/LogoutButton.tsx
     - app/admin/login/... (standalone login)
     - app/layout.tsx and components/SiteHeader.jsx

After this, there will be ONE page per route and the build will pass.
The booking/payment flow is untouched.
