'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

function ConsentInline({ onChange }) {{
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => onChange?.({{ accepted, name }}), [accepted, name]);

  return (
    <section className="mt-8 p-5 border rounded-2xl bg-white">
      <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for ongoing care.</li>
        <li>I can revoke consent in writing, except where action has already been taken based on this consent.</li>
        <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
      </ul>
      <p className="text-sm text-gray-600 mt-2">
        Read the full agreement at <Link href="/consent" className="underline">/consent</Link>. <span className="font-mono text-xs">v0823-catchall</span>
      </p>
      <label className="flex items-start gap-3 mt-4">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={{accepted}} onChange={e=>setAccepted(e.target.checked)} />
        <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
      </label>
      <div className="mt-4">
        <label className="block text-sm font-medium">Full Name (type to sign)</label>
        <input type="text" className="mt-1 w-full rounded-xl border px-3 py-2" value={{name}} onChange={{e=>setName(e.target.value)}} placeholder="Your full legal name"/>
      </div>
    </section>
  );
}}

async function storeConsent(consent) {{
  try {{
    await fetch('/api/consent', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ consent }})
    }});
  }} catch {{}}
}}

export default function Page() {{
  const [consent, setConsent] = useState({{ accepted: false, name: '' }});
  const canContinue = consent.accepted && (consent.name||'').trim().length >= 2;

  async function handleContinue(e) {{
    e.preventDefault();
    if (!canContinue) return;
    await storeConsent(consent);

    // Get redirectUrl from your existing API (fallback default)
    let redirectUrl = null;
    try {{
      const r = await fetch('/api/book', {{ method:'POST', headers:{{'Content-Type':'application/json'}}, body: JSON.stringify({{}}) }});
      const data = await r.json();
      redirectUrl = data.redirectUrl || data.paymentUrl || data.url || null;
    }} catch (err) {{}}
    if (!redirectUrl) {{
      alert('Missing redirectUrl from /api/book');
      return;
    }}
    window.location.href = redirectUrl;
  }}

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-white bg-black inline-block px-2 py-1 rounded">Consent inline build v0823-catchall — /(site)/book (src)</div>
      <h1 className="text-3xl font-bold mt-3">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>
      <ConsentInline onChange={{setConsent}}/>
      <div className="mt-6 flex gap-3">
        <button onClick={{handleContinue}} disabled={{!canContinue}} className={{`px-4 py-2 rounded-xl text-white ${{canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}}`}}>
          Continue to Payment
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
      {{!canContinue && <p className="text-sm text-red-600 mt-2">Please tick the consent box and enter your full name to continue.</p>}}
    </main>
  );
}}
