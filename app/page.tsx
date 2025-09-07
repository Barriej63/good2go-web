// app/page.tsx
export default function Home() {
  return (
    <main className="px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold">Good2Go Bookings</h1>
      <p className="mt-2 text-gray-600">Baseline & post-concussion monitoring appointments.</p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <a href="/book" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-6 py-3">Book a Test</a>
        <a href="/admin/login" className="bg-gray-100 hover:bg-gray-200 text-gray-900 rounded px-6 py-3">Clinician/Admin Login</a>
      </div>
    </main>
  );
}

