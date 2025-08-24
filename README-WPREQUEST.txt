Worldline WPRequest — Server-side bundle (Good2Go)

FILES
-----
app/api/worldline/create/route.js   -> Calls WPRequest with Basic auth and returns { ok, redirectUrl }
app/pay/redirect/page.jsx           -> Client page that calls the create route and forwards the browser

ENV (WORLDLINE first, WORLDPAY fallback)
----------------------------------------
WORLDLINE_ENV=uat                    # or prod
WORLDLINE_ACCOUNT_ID=xxxxxxxx        # aka AccountId / MerchantId used by your Click account
WORLDLINE_USERNAME=xxxxxxxx
WORLDLINE_PASSWORD=xxxxxxxx
NEXT_PUBLIC_SITE_ORIGIN=https://good2go-rth.com

Optional (already used elsewhere):
WORLDLINE_SUCCESS_URL=https://good2go-rth.com/success
WORLDLINE_CANCEL_URL=https://good2go-rth.com/cancel
WORLDLINE_ERROR_URL=https://good2go-rth.com/error

HOW IT WORKS
------------
1) Booking page redirects to /pay/redirect?ref=...&amount=...
2) /pay/redirect (client) calls /api/worldline/create?ref=...&amount=...
3) Server calls: {UAT|PROD}/api/webpayments/paymentservice/rest/WPRequest with Basic auth
4) Returns { ok:true, redirectUrl } -> browser navigates there (hosted payment page)

DIAGNOSTICS
-----------
If WPRequest returns an error (e.g. AUTHENTICATION 3000), the API responds with:
{ ok:false, stage:'wprequest_error', status, sample: '<first 1200 chars of body>' }

Check your creds:
- WORLDLINE_ACCOUNT_ID (or WORLDPAY_ACCOUNT_ID)
- WORLDLINE_USERNAME
- WORLDLINE_PASSWORD
