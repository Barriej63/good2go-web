# Return Logging + Debug Patch
Generated 2025-08-25T09:44:47.803775Z

- Handles both GET query and POST form body from Worldline.
- Logs all returns under Firestore collection `returns_log`.
- Persists payment docs and updates booking docs.
- Sends confirmation email via SendGrid (using SENDGRID_API_KEY + SENDGRID_FROM).
- If `&debug=1` is appended to the URL, returns JSON instead of redirect.

Deploy, then do a test payment. After payment, copy the Request URL of /api/worldline/return from DevTools,
append &debug=1, and load it. You should see JSON with the parsed payload.

Check Firestore:
- `returns_log/*`
- `payments/<TransactionId>`
- `bookings/<Reference>` updated with paid:true, etc.
