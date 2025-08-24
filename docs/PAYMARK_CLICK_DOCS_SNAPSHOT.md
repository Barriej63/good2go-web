# Worldline CLICK (Hosted Payment Page) — Key Specs Snapshot
_Archived_: 2025-08-24T20:31:54.608100Z  
_Source_: https://developer.paymark.co.nz/click/

## Endpoints
**Production**
- Web Payments (HPP WPRequest): https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest
- Transaction Processing: https://secure.paymarkclick.co.nz/api/transaction

**UAT**
- Web Payments (HPP WPRequest): https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest
- Transaction Processing: https://uat.paymarkclick.co.nz/api/transaction

## Authentication
- In POST body: `username`, `password`, `account_id`
- Or HTTP Basic: `Authorization: Basic <base64(username:password)>`

## HPP (WPRequest) Basics
- Method: **POST**
- Content-Type: **application/x-www-form-urlencoded**
- Accept: **text/plain** (returns URL string)
- Required fields:
  - `cmd=_xclick`
  - `type=purchase` (or `authorisation`, `statuscheck`, `tokenise`)
  - `amount` (decimal, e.g. `65.00`)
  - `return_url` (public URL)
  - `username`, `password`, `account_id`
- Optional but recommended:
  - `reference` (≤ 50 chars, truncated to 12 on statement)
  - `particular` (≤ 50 chars)
  - `transaction_source=INTERNET`

## Notes
- If fields are invalid, a URL with an **error code** is returned.
- `reference` and `particular` are merchant-defined; keep them short and clean.
- Make sure the **return_url** is publicly accessible and whitelisted if required.
