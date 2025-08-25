Enhanced booking resolver + orphan logging
Generated: 2025-08-25T21:05:49.837632Z

- Tries bookings/<Reference> (doc id), then queries by 'ref', then 'reference'
- Writes payments/<tx> always
- If no booking found, logs to returns_orphans/* (no booking created)
- Safe email send only when a booking is found
- '&debug=1' returns detailed JSON

Env (optional):
- RETURN_NO_EMAIL=1 to disable emails during testing
