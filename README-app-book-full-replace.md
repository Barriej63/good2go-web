# App Router Booking Page – Full Replacement (0823)

This patch **replaces** `app/book/page.jsx` and wires in the Consent & Disclaimer gating.

## Files
- `app/book/page.jsx` – full replacement with ConsentBlock and gated Continue button.
- `components/ConsentBlock.jsx` – reusable consent UI (checkbox + typed name + optional signature canvas).
- `content/consentText.js` – short-form consent bullets + a version string (saved with each consent).
- `app/api/consent/route.js` – API route to persist consent to Firestore.

## How to apply
1. Unzip at your repo root so folders merge into `/app`, `/components`, `/content`.
2. **Overwrite** your existing `app/book/page.jsx` with the provided file.
3. Replace the placeholder `alert('Proceed to payment wiring here')` with your existing booking/payment redirect call.
4. Ensure `lib/firebaseAdmin.js` exports `getAdminDb()` (Firestore Admin).

## Notes
- The Continue button is disabled until the checkbox is ticked and a full name is typed.
- If a booking `bid` is already known (e.g., appended to the URL), the consent is attached directly to that booking; otherwise a record is created in `standalone_consents`.
