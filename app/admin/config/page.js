
// app/admin/config/page.js
"use client";
import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    async function fetchConfig() {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    }
    fetchConfig();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Config (Regions & Time Slots)</h1>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}
