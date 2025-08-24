// This tiny client hook auto-redirects after a successful /api/book call.
// It avoids having to rewrite your whole booking page.
// Usage: add on the first line of app/book/page.jsx ->  import "./redirect-hook";
"use client";

(function () {
  if (typeof window === "undefined") return;

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const res = await origFetch(input, init);
    try {
      const url = (typeof input === "string") ? input : (input && input.url) || "";
      if (url.includes("/api/book") && (init?.method || "GET").toUpperCase() === "POST") {
        const clone = res.clone();
        const data = await clone.json().catch(() => null);
        if (data && data.ok && data.bookingRef) {
          // Decide $65 vs $199 by inspecting existing radio/selector on the page
          let isPackage = false;
          try {
            const pkgRadio = document.querySelector('input[name="product"][value="package"]');
            if (pkgRadio) isPackage = pkgRadio.checked;
          } catch {}
          const amount = isPackage ? 19900 : 6500;
          const next = `/pay/redirect?ref=${encodeURIComponent(data.bookingRef)}&amount=${amount}`;
          window.location.href = next;
        }
      }
    } catch (e) {
      console.warn("redirect-hook failed (non-fatal):", e);
    }
    return res;
  };
})();
