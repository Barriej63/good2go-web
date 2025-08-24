# Good2Go — Worldline WPRequest Bundle (0824)

This bundle wires the *Web Payments* WPRequest endpoint you used successfully on 23/08.

## Files
- `app/pay/redirect/page.jsx` – client page that reads `ref` & `amount` and calls `/api/worldline/create`. It is opt‑out of pre‑rendering (fixes the Suspense/prerender build errors).
- `app/api/worldline/create/route.ts` – server route that calls Worldline **WPRequest** (JSON first, then falls back to `x-www-form-urlencoded`) and returns `{ ok:true, redirectUrl }`.
- `app/api/worldline/return/route.ts` – optional return endpoint if you have “Post to Return URL” enabled.
- `lib/url.ts` – small helper to generate absolute URLs from the request origin.

## Expected env vars
- `WORLDLINE_ENV` = `production` or `uat`
- `WORLDLINE_ACCOUNT_ID`
- `WORLDLINE_USERNAME`
- `WORLDLINE_PASSWORD`
- `NEXT_PUBLIC_WL_RETURN_SUCCESS` (e.g. `https://good2go-rth.com/success`)
- `NEXT_PUBLIC_WL_RETURN_CANCEL`  (e.g. `https://good2go-rth.com/cancel`)
- `NEXT_PUBLIC_WL_RETURN_ERROR`   (e.g. `https://good2go-rth.com/error`)

## Test flow
1. Deploy.
2. Open `https://YOUR_HOST/pay/redirect?ref=TEST-ABC&amount=6500`.
3. You should see "Connecting to Payment…" then be redirected to Worldline. If not, the page will alert with server diagnostics.

## Notes
- The `/api/worldline/create` route tries JSON first, then a form-url-encoded POST (some tenants still require that shape).
- The route can parse JSON/XML/HTML replies and will return a trimmed sample if no redirect link is present.
- If your Click tenant requires different field names, share the integration field list and I’ll adjust the route payload.
