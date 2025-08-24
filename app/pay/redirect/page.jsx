"use client";
import React, { Suspense } from "react";

// Client-only page that POSTS to Worldline WPRequest and then redirects
// Expects: /pay/redirect?ref=<BOOKING_REF>&amount=<CENTS>

export const dynamic = "force-dynamic";
export const revalidate = 0;

function RedirectInner() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  if (!params) return null;

  const ref = params.get("ref") || "";
  const amount = params.get("amount") || "";
  const env = (process.env.NEXT_PUBLIC_WORLDLINE_ENV || "production").toLowerCase();
  const base =
    env === "uat"
      ? "https://uat.paymarkclick.co.nz"
      : "https://secure.paymarkclick.co.nz";

  const endpoint = base + "/api/webpayments/paymentservice/rest/WPRequest";

  React.useEffect(() => {
    async function go() {
      try {
        if (!ref || !amount) {
          window.location.href = "/error?code=missing_params";
          return;
        }

        const form = new URLSearchParams();
        form.set("AccountId", process.env.NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID || "");
        form.set("Username", process.env.NEXT_PUBLIC_WORLDLINE_USERNAME || "");
        form.set("Password", process.env.NEXT_PUBLIC_WORLDLINE_PASSWORD || "");
        form.set("TransactionType", "Purchase");
        form.set("Amount", String(amount));
        form.set("Currency", "NZD");
        form.set("MerchantReference", ref);
        form.set("MerchantName", process.env.NEXT_PUBLIC_WORLDLINE_MERCHANT_NAME || "Good2Go");
        // Return URL (browser redirect) — we still also have server notify at /api/worldline/return if you wire it later
        form.set("ReturnUrl", window.location.origin + "/success?ref=" + encodeURIComponent(ref));
        // Optional: cancel/error landing pages
        form.set("CancelUrl", window.location.origin + "/cancel?ref=" + encodeURIComponent(ref));
        form.set("ErrorUrl", window.location.origin + "/error?ref=" + encodeURIComponent(ref));

        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          redirect: "follow",
          mode: "cors",
        });

        const text = await r.text();
        // Try JSON first, otherwise fallback to XML-ish payloads that expose a q= token
        try {
          const j = JSON.parse(text);
          if (j && j.redirectUrl) {
            window.location.href = j.redirectUrl;
            return;
          }
        } catch {}
        // Look for WP redirect token within response
        const m = text.match(/webpayments\/default\.aspx\?q=([A-Za-z0-9]+)/i);
        if (m) {
          const wp = (env === "uat" ? "https://uat.paymarkclick.co.nz" : "https://secure.paymarkclick.co.nz")
                    + "/webpayments/default.aspx?q=" + m[1];
          window.location.href = wp;
          return;
        }

        // If Worldline responded with an explicit error XML, show it compactly
        if (!r.ok) {
          const mini = text.slice(0, 600);
          console.error("Worldline WPRequest error:", r.status, mini);
          alert("Payment create failed (" + r.status + "). Check console for details.");
          window.location.href = "/error?stage=wp_create";
          return;
        }

        // Fallback — navigate to /error so user isn't stuck
        console.error("Unexpected WPRequest response:", text.slice(0, 600));
        window.location.href = "/error?stage=wp_response";
      } catch (e) {
        console.error("WP redirect fatal:", e);
        window.location.href = "/error?stage=wp_exception";
      }
    }
    go();
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Redirecting to Payment…</h1>
      <p className="text-gray-600">Booking reference: <strong>{ref}</strong></p>
      <p className="text-gray-600">Amount (cents): {amount}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Preparing payment…</div>}>
      <RedirectInner />
    </Suspense>
  );
}
