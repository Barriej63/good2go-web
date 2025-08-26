Good2Go Admin Auto-Refresh Bookings Page (No SWR)
Generated: 2025-08-26T00:47:33.845917Z

This replaces:
- app/admin/bookings/page.tsx

Changes:
- Removes 'swr' dependency.
- Uses fetch + setInterval for refresh (every 15s).
- Keeps limit selector and auto-refresh logic.

Secured by ADMIN_TOKEN via /api/admin/bookings-feed
