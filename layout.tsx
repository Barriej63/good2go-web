export const metadata = { title: 'Good2Go — Concussion Testing', description: 'Bookings and info' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily:'system-ui', margin:0 }}>
        <header style={{ padding:'16px', borderBottom:'1px solid #eee' }}>
          <h1 style={{ margin:0 }}>Good2Go — Concussion Monitoring</h1>
        </header>
        <main style={{ maxWidth:960, margin:'0 auto', padding:16 }}>{children}</main>
      </body>
    </html>
  )
}
