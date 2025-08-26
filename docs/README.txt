Good2Go: Worldline Return Route (GET + POST) — Build-safe SendGrid
Generated: 2025-08-26T00:40:02.342878Z

This overlay provides:
- app/api/worldline/return/route.ts
  * Accepts GET and POST (form-urlencoded, multipart/form-data, JSON)
  * Writes payments/<TransactionId> with raw payload
  * Updates bookings/<Reference> when your create step sets MerchantReference=bookingId
  * Sends confirmation email via SendGrid (no bad escapes)
  * ?debug=1 returns JSON; otherwise 302 to /success?ref=...

Env used (optional):
- SENDGRID_API_KEY, SENDGRID_FROM
- SUCCESS_PAGE_PATH (defaults to /success)
