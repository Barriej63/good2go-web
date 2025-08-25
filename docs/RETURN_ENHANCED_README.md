# Return Route — Booking Email (Date/Time/Venue) + Firestore updates
Generated: 2025-08-25T08:26:25.704354Z

This patch **does not change** the booking or payment steps.
It only enhances `/api/worldline/return` to:

- Parse Worldline GET/POST params.
- Look up `bookings/<Reference>`.
- Update that doc with:
  - `paid: true`, `paidAt: <ISO>`, `status: "paid"`
  - `amountCents` (derived from Worldline `Amount` if present)
  - `worldline` map with key response fields + `env` and `returnedAt`.
- Create `/payments/<TransactionId>` (idempotent).
- Email the customer using the stored booking email (`email`/`clientEmail`/`customerEmail`/`contactEmail`), including **booking date, time, region, venue**.
- Fallback to `BOOKING_NOTIFY_TO` if booking email is missing.
- Redirect to `/success?ref=<Reference>`.

If your existing booking docs use the fields listed in your example, this will align with that shape.
