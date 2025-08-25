Generated 2025-08-25T03:46:25.374990Z
- Makes /api/book accept multiple payload shapes and not hard-fail on missing name/email.
- Returns {ok:true, bookingRef, used, warnings} so the front-end can proceed to payment.
