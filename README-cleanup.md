# App Router cleanup for /book (no Pages Router)

Your build failed because multiple files were defining the same route:

- `pages/book.js`  (Pages Router)
- `app/(site)/book/page.jsx` (App Router)
- `app/book/page.tsx` (App Router)

Next.js requires **only one** source of truth for a given path.

## Fix steps
1. **Delete the entire `/pages` folder** if you are using App Router only.
   - Specifically remove: `pages/book.js`
2. Remove duplicate App Router routes you don't use:
   - Delete `app/(site)/book/page.jsx` if present.
3. Keep **one** booking page only:
   - `app/book/page.tsx`  ← use the file in this pack.

4. Commit & deploy.

## What this pack adds
- `app/book/page.tsx`: booking page with consent gating and redirect
- `app/api/consent/route.ts`: saves consent (merges into `bookings` by `bid` if available)

