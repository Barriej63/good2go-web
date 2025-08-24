G2G — Worldline Click (WPRequest) Bundle • 2025‑08‑25

FILES
-----
app/api/worldline/create/route.js   ← server calls WPRequest, returns { ok, redirectUrl }
app/pay/redirect/page.jsx           ← client calls the above and follows redirectUrl
app/api/worldline/return/route.js   ← marks booking paid then redirects to /success?ref=...

ENV (WORLDLINE first, WORLDPAY fallback)
---------------------------------------
WORLDLINE_ENV=uat                    # or prod
WORLDLINE_MERCHANT_ID=14617
WORLDLINE_USERNAME=xxxxxxxx
WORLDLINE_PASSWORD=xxxxxxxx
# Optional fallback names if you already use WORLDPAY_*:
# WORLDPAY_ENV / WORLDPAY_MERCHANT_ID / WORLDPAY_USERNAME / WORLDPAY_PASSWORD

NEXT_PUBLIC_SITE_ORIGIN=https://good2go-rth.com

USAGE FROM BOOKING PAGE
-----------------------
After /api/book returns { ok:true, bookingRef }:
  const amount = isPackage ? 19900 : 6500; // cents
  window.location.href = `/pay/redirect?ref=${encodeURIComponent(bookingRef)}&amount=${amount}`;

DEBUG
-----
If create fails: DevTools → Network → worldline/create. JSON includes 'stage' and a 'sample'
of Worldline's response so you can adjust if your tenant expects slightly different keys.

