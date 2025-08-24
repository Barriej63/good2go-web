# Good2Go — Pay Redirect Suspense Fix (0825)

This bundle fixes the build error:
> useSearchParams() should be wrapped in a suspense boundary at page "/pay/redirect"

and keeps the Worldline redirect logic on the client.

## Files in this ZIP

- `app/pay/redirect/page.jsx` — server component wrapper with `<Suspense>` and `dynamic = 'force-dynamic'`
- `app/pay/redirect/redirect-client.jsx` — client component that reads `?ref` and `?amount` then posts
  a hidden form to the Worldline **WPRequest** endpoint.

Place the folders at the **repo root** so paths match exactly.

## Required ENV (client‑exposed)

Set these in your hosting dashboard as **public** envs (NEXT_PUBLIC_…):

- `NEXT_PUBLIC_WORLDLINE_ENV` — `uat` or `prod`
- `NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID` — your Click accountId / merchantId (common param name varies by tenant)
- `NEXT_PUBLIC_WORLDLINE_USERNAME`
- `NEXT_PUBLIC_WORLDLINE_PASSWORD`
- `NEXT_PUBLIC_PAYMENT_CURRENCY` — default `NZD` (optional)

> If your tenant expects different parameter names (e.g. `merchantId` instead of `account_id`), edit
> the three form fields in `redirect-client.jsx` to match.

## Booking page

After `/api/book` returns `{ ok:true, bookingRef }`, redirect the browser to:

```js
const amount = isPackage ? 19900 : 6500; // cents
window.location.href = `/pay/redirect?ref=${encodeURIComponent(bookingRef)}&amount=${amount}`;
```

## Notes

- This page is **not pre-rendered** (`dynamic = 'force-dynamic'`) because it depends on search params.
- If you later want server‑side creation instead of a browser POST, swap the form code
  for a `fetch('/api/worldline/create', …)` and redirect to the URL your API returns.
