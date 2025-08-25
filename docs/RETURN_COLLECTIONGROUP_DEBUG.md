# Return overlay: collectionGroup booking update + Firebase project debug
Generated: 2025-08-25T10:15:01.977459Z

- /api/worldline/return now finds the booking via Firestore collectionGroup('bookings')
  so it works with nested paths like bookings/{tenant}/bookings/{ref}.
- Writes payments as before; updates booking doc and subcollection payments.
- Emails customer using email from the resolved booking doc.
- /api/debug/firebase returns the Firebase project in use and can resolve a booking path by ?ref=G2G-....
