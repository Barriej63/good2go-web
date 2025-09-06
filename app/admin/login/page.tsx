// app/admin/login/page.tsx  (SERVER component – no "use client")
import LoginForm from './LoginForm';

export const metadata = { title: 'Admin Login — Good2Go' };

export default function AdminLoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
      <h1 style={{ marginTop: 0 }}>Admin Login</h1>
      <p style={{ color: '#64748b' }}>
        Enter your one-time admin token. A secure cookie is set for subsequent requests.
      </p>

      {/* Interactive client component */}
      <LoginForm />

      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>
        Tip: On a trusted device, you can also visit <code>/admin?token=YOUR_TOKEN</code> once—this sets the cookie and removes the token from the URL.
      </p>
    </main>
  );
}
