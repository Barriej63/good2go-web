
// app/admin/page.js
export default function AdminHome() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>
      <ul>
        <li><a href="/admin/bookings">Manage Bookings</a></li>
        <li><a href="/admin/config">Manage Config (Regions & Time Slots)</a></li>
      </ul>
    </div>
  );
}
