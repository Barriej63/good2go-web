Good2Go Fix for Build Failure in return route
Generated: 2025-08-26T00:33:36.876832Z

Replaces:
- app/api/worldline/return/route.ts

Fixes:
- Removes bad escape in SendGrid header block.
- Correct header syntax: Authorization: `Bearer <key>`
