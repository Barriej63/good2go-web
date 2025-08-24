G2G Payments Full Bundle (0825b)

Files included:
- app/api/worldline/create/route.ts  (calls Worldline WPRequest, returns redirectUrl)
- app/api/worldline/return/route.ts  (optional: marks booking paid when called)
- app/api/book/route.js               (creates booking + calls worldline/create and returns redirectUrl)
- app/pay/redirect/REMOVE_THIS_FOLDER.txt (marker to remind you to delete the legacy page)

IMPORTANT
1) REMOVE the whole app/pay/redirect/ folder from your repo (it caused the build errors). This bundle replaces that flow.
2) Ensure env vars exist in your host:
   WORLDLINE_ENV=production  (or 'uat')
   WORLDLINE_ACCOUNT_ID=...
   WORLDLINE_USERNAME=...
   WORLDLINE_PASSWORD=...
   WORLDLINE_MERCHANT_ID=...
   WORLDLINE_MERCHANT_NAME=Motus Plus   (or S5Netball etc.)
   WORLDLINE_CURRENCY=NZD
   NEXT_PUBLIC_SITE_ORIGIN=https://good2go-rth.com
3) Client code: after calling POST /api/book, redirect to data.redirectUrl
   (You can keep your existing form – just redirect if ok.)

