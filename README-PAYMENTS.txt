Good2Go Payments TS Patch — 2025-08-24

This patch provides:
- app/api/book/route.js                        (JS)
- app/api/worldline/create/route.ts           (TS)
- app/api/worldline/return/route.ts           (TS)

Why JS for /book? It's minimal and avoids TS friction. The Worldline routes are typed and compile under strict mode.

ENV (UAT):
WORLDLINE_API_BASE=https://uat.paymarkclick.co.nz
WORLDLINE_ENV=uat
WORLDPAY_ACCOUNT_ID=xxxx
WORLDPAY_USERNAME=xxxx
WORLDPAY_PASSWORD=xxxx
# optional
DEBUG_HPP=1

Flow:
- POST /api/book -> writes Firestore + returns redirectUrl (/api/worldline/create?ref=<ref>&amount=<cents>)
- GET  /api/worldline/create -> calls Worldline and 302 to HPP (or JSON if DEBUG_HPP=1 on failure)
- Worldline return -> /api/worldline/return?bid=<ref> marks booking paid and hands off to /success
