Good2Go — Flexible HPP Redirect Layer (08-24)

What this patch does
--------------------
• /api/book now always returns a redirectUrl that points to /pay/redirect?bid=...&amount=...&ref=...
• /pay/redirect renders an auto-posting <form> to whatever endpoint you set in WORLDLINE_FORM_ENDPOINT,
  using the hidden fields you define in WORLDLINE_FORM_FIELDS (JSON). It replaces tokens like
  {{amount}}, {{reference}}, {{bid}}, {{successUrl}}, {{failUrl}}, {{cancelUrl}} at runtime.
• /api/worldline/return marks the booking as paid/failed and then redirects to /success?ref=...

How to configure (env)
----------------------
WORLDLINE_FORM_ENDPOINT=https://secure.paymarkclick.co.nz/webpayments
# or UAT: https://uat.paymarkclick.co.nz/webpayments

# Example field mapping for Paymark CLICK HPP (adjust to your account's spec).
# Replace AccountId with your actual account / merchant number.
WORLDLINE_FORM_FIELDS={
  "AccountId":"14617",
  "Amount":"{{amount}}",
  "Reference":"{{reference}}",
  "SuccessURL":"{{successUrl}}",
  "FailURL":"{{failUrl}}",
  "CancelURL":"{{cancelUrl}}"
}

Also ensure the booking page sends "amount" in cents (e.g. 6500 or 19900).
If omitted, /api/book will default to NEXT_PUBLIC_BASELINE_AMOUNT_CENTS (or 6500).

Why this is robust
------------------
When the gateway's exact API path or field names differ per merchant/environment, hard-coding
a server-side fetch is brittle. This approach keeps the HPP integration purely as an HTML Form POST,
which is how most hosted pages are designed to be used. If Worldline changes the field names or you
swap to another HPP, you only edit the environment JSON (no code changes).

Files included
--------------
• app/api/book/route.js            – creates the booking & returns redirectUrl -> /pay/redirect
• app/pay/redirect/page.jsx        – auto-posts to your configured HPP
• app/api/worldline/return/route.js – marks booking paid/failed and forwards to /success

Rollback
--------
Remove these three files or restore your originals.
