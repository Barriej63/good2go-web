export default function Home() {
  return (
    <main style={{display:"grid",placeItems:"center",minHeight:"100vh",padding:"32px"}}>
      <div style={{maxWidth:740}}>
        <h1 style={{marginBottom:8}}>Good2Go — Staging</h1>
        <p>Domain and environment are configured. This is the password‑protected placeholder.</p>
        <ul>
          <li>Firebase connected to <b>good2go-staging</b></li>
          <li>Worldpay/Paymark env vars loaded (live)</li>
          <li>GA4 disabled until production</li>
        </ul>
      </div>
    </main>
  );
}
