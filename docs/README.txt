Guarded Worldline Return + Echo Debug
Generated: 2025-08-25T20:10:09.233057Z

- app/api/worldline/return/route.ts: fully guarded (try/catch everywhere), logs to returns_log/returns_error, supports GET+POST, emails behind RETURN_NO_EMAIL flag.
- app/api/debug/echo/route.ts: echoes query/body to verify what's arriving.

Env (optional):
- RETURN_NO_EMAIL=1  # to disable email during tests
