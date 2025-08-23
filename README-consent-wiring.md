# Good2Go – Consent wiring pack (0823)

## What this adds
- Required **checkbox + typed name** before continuing to payment on `/booking`.
- Optional **signature canvas** (base64 PNG saved if drawn).
- API endpoint `POST /api/consent` that:
  - If given a `bid`, merges consent into the matching `bookings` doc.
  - Else stores into `standalone_consents` with timestamp and version.
- General **/disclaimer** page content per your copy.
- Heading on booking page set to **"Book a Good2Go Assessment"**.

## How to integrate with your existing flow
1. If your booking flow already creates a booking and knows `bid` **before** redirecting to payment,
   ensure `bid` is visible to the page (e.g., in the querystring) so `/api/consent` can attach to it.

2. If you create the booking only **after** payment:
   - Keep this pack's gating (checkbox + name).
   - After payment completes and you have a `bid`, copy any `standalone_consents` for this user into the booking (optional).

3. Replace the `alert('Proceeding to payment...')` in `app/booking/page.jsx` with your current
   `createBookingAndRedirectToPayment(...)` call.

## Security note
This saves the signature as a data URL in Firestore if present. If you prefer Cloud Storage, swap the API to upload the PNG via Admin SDK and store the gs:// URL instead.

## Files
- `app/booking/page.jsx` – demo booking page with consent gating UI.
- `components/ConsentBlock.jsx` – reusable consent UI.
- `app/api/consent/route.js` – stores consent (attached to booking when possible).
- `content/consentText.js` – consent text summary and version.
- `app/disclaimer/page.jsx` – your general disclaimer text.

