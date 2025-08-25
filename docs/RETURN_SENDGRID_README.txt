SendGrid-enabled return route — generated 2025-08-25T08:46:18.407152Z

- Uses SENDGRID_API_KEY and SENDGRID_FROM (e.g. 'Good2Go <help@good2go-rth.com>') to send emails via v3 API (no npm dep).
- Looks up booking by Reference and emails the customer's saved address (fallback BOOKING_NOTIFY_TO).
- Persists payment to Firestore and updates booking (paid:true, paidAt, status:'paid', worldline details).
- Redirects to /success?ref=... as before.
Env needed:
SENDGRID_API_KEY=...
SENDGRID_FROM=Good2Go <help@good2go-rth.com>
(optional) BOOKING_NOTIFY_TO=you@yourdomain.com
(optional) SITE_BASE_URL=https://good2go-web.vercel.app
