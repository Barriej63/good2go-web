Good2Go Admin — Manual Refresh + Delta-only fetch
Generated: 2025-08-26T02:41:55.377410Z

What this does
- Admin page is now **manual refresh** only.
- "Refresh (full latest)" loads the newest N bookings (default 200).
- "Fetch new only" calls the feed with `since=<latestCreatedAt>` and **only returns newer docs**, then prepends them.
- This dramatically reduces Firestore reads (no polling; delta-only when you click).

New/Updated files
- app/api/admin/bookings-feed/route.ts  (adds `since` + `order` support, limit, ADMIN_TOKEN guard)
- app/admin/bookings/page.tsx           (manual buttons + delta logic, search, status chips)

Usage
- /admin/bookings?token=YOUR_ADMIN_TOKEN
- Click "Refresh (full latest)" once to seed the list.
- Click "Fetch new only" to append only the bookings newer than your last load.
