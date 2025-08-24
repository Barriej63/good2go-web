# BUILD_STATUS — Payment Fix (0825)

Generated: 2025-08-24T20:31:54.612553Z

## Required Env
WORLDLINE_USERNAME=
WORLDLINE_PASSWORD=
WORLDLINE_ACCOUNT_ID=
WORLDLINE_ENV=uat   # or production
WORLDLINE_RETURN_URL=https://your-domain/success

## What Changed
- `/api/worldline/create` now posts **form-encoded** to WPRequest REST endpoint.
- Correct HPP params: `cmd=_xclick`, `type`, `amount`, `reference`, `return_url`, `transaction_source`, plus auth.
- Accepts plain-text URL response; surfaces sample body on error for quick debugging.

## Smoke Tests
- Visit `/api/worldline/test` → should return `ok:true` and a URL sample (even for statuscheck).
- Trigger booking flow → ensure it calls `/api/worldline/create?amount=65&ref=...` and then redirects to returned URL.
