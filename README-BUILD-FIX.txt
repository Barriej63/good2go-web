Build Fix Return Route — 2025-08-25T08:37:55.524397Z

This overlay removes the `@/lib/email` import that caused the build to fail.
- It uses an internal no-op `sendEmail()` stub so the app **builds** and the payment/redirect flow remains intact.
- Firestore persistence logic remains.
- When you're ready, replace the `sendEmail()` stub with your working email call.

File replaced:
- app/api/worldline/return/route.ts
