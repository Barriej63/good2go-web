0825e Patch (content-negotiation) — generated 2025-08-25T04:19:28.594226Z

- `/api/worldline/create` now parses XML-wrapped URLs and supports **both** GET and POST.
- It returns **JSON** when the request **Accept** header includes `application/json`,
  otherwise it returns **text/plain** with just the URL (so `window.location.href = responseText` works).
- `/api/worldline/test` updated to use the same extraction logic and returns the cleaned URL in `sample`.
