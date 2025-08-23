# Good2Go UI Pack (Header, Footer, Region Cards)

## What this adds
- Global **Header** and **Footer** (via `app/layout.jsx`)
- **RegionCards** on the landing page to deep-link into `/booking?region=<Name>`
- Updated landing page CTA wording: "Book a Good2Go Assessment"

## Install
Unzip at the repo root so folders merge into `/app`, `/components`, and `/content`.

If your project already has `app/layout.jsx` or `app/page.jsx`, do a quick manual merge:
- Keep your global CSS import.
- Insert `<SiteHeader/>` before `{children}` and `<SiteFooter/>` after.
- On the home page, import and place `<RegionCards/>` where you want the region grid.

## Booking page title change
Update the heading on your booking page to: **"Book a Good2Go Assessment"**.
Search your repo for the old text and replace:
- Old: `Book a Good2Go Session`
- New: `Book a Good2Go Assessment`

If you prefer, you can reference a shared title string to avoid drift:
```js
// components/PageTitles.js
export const TITLES = {
  booking: 'Book a Good2Go Assessment',
};
```
Then import and use `TITLES.booking` on the booking page.
