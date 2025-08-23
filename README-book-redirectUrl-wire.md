# Book page full replacement (App Router)

This version saves consent, then redirects to your payment page using **window.location.href = redirectUrl**.

## How redirectUrl is obtained
The helper `getRedirectUrl(formValues)` does one of the following:

1) If your site defines `window.createBookingAndGetRedirectUrl(formValues)` it will call it and expect
   an object with `{ redirectUrl }` (or `paymentUrl`/`url`).

2) Otherwise it will POST to **/api/book** with the `formValues` object and expect JSON `{ redirectUrl }`.

If your endpoint is different, change `BOOK_API_PATH` at the top of `app/book/page.jsx`.

## Hooking up your existing form values
Give your inputs these ids so the page can read them automatically:
- `region`
- `slot`
- `fullName`
- `email`

Or, replace `collectFormValues()` with your own state.

## Consent
- Button is disabled until the box is ticked and a full name is typed.
- The API `POST /api/consent` saves consent with `bid` if present in the URL.
