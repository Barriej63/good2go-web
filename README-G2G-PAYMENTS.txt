G2G – Payments bundle (Worldline/Click redirect, 2025‑08‑25)

WHAT THIS CONTAINS
------------------
1) app/pay/redirect/page.jsx
   • Client page that POSTS a real HTML form to Click "webpayments" and auto-submits.
   • Accepts query: ?ref=<BOOKING_REF>&amount=<CENTS>

2) app/api/book/route.js
   • Relaxed validation (prevents 400s while iterating)
   • Writes to Firestore if Admin SDK is configured, else still returns { ok:true, bookingRef }
   • DOES NOT try to build any payment URL. Your booking page should redirect to /pay/redirect
     after it receives { ok:true, bookingRef } from POST /api/book.

3) app/api/worldline/return/route.js
   • Handler for the payment gateway to bounce back to; marks paid=true by bookingRef
     and then redirects the user to /success?ref=...

ENV VARS (NEXT_PUBLIC_ so they are embedded and available client-side)
---------------------------------------------------------------------
# Required:
NEXT_PUBLIC_WORLDLINE_MERCHANT_ID=14617
NEXT_PUBLIC_WORLDLINE_POST_URL=https://secure.paymarkclick.co.nz/webpayments   # UAT: https://uat.paymarkclick.co.nz/webpayments
NEXT_PUBLIC_WORLDLINE_CURRENCY=NZD
NEXT_PUBLIC_BASE_URL=https://good2go-rth.com

# Optional field-name overrides (defaults shown):
NEXT_PUBLIC_WORLDLINE_FIELD_MERCHANT=merchantId
NEXT_PUBLIC_WORLDLINE_FIELD_AMOUNT=amount
NEXT_PUBLIC_WORLDLINE_FIELD_CURRENCY=currency
NEXT_PUBLIC_WORLDLINE_FIELD_REFERENCE=reference
NEXT_PUBLIC_WORLDLINE_FIELD_RETURN=return_url
# Optional notification hook (sent same as return):
# NEXT_PUBLIC_WORLDLINE_FIELD_NOTIFY=notification_url

# Optional extra form fields (JSON):
# NEXT_PUBLIC_WORLDLINE_EXTRA_FIELDS={"testMode":"true"}

HOW TO WIRE THE BOOKING PAGE
----------------------------
After a successful POST to /api/book (response includes { ok:true, bookingRef }),
send the user to:

  /pay/redirect?ref=<bookingRef>&amount=<cents>

For Baseline ($65): amount = 6500
For Package  ($199): amount = 19900

EXAMPLE (inside your existing client handler on /book):
------------------------------------------------------
const amount = isPackage ? 19900 : 6500;
const url = `/pay/redirect?ref=${encodeURIComponent(bookingRef)}&amount=${amount}`;
window.location.href = url;

TROUBLESHOOTING
---------------
• 405 to /webpayments:
  You tried to GET the gateway. This bundle always POSTs, so use /pay/redirect.

• "Could not start payment (no redirectUrl)":
  That came from earlier client code that expected a payment URL from /api/book.
  With this bundle you don't need a payment URL. You redirect to /pay/redirect yourself.

• Still seeing 400 on /api/book:
  Open DevTools → Network → click "book" → Response.
  You will get a JSON listing exactly which "missing_required_fields" were false.

GOOD LUCK!
