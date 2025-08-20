
// app/admin/bookings/page.js
"use client";
import { useEffect, useState } from "react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function fetchBookings() {
      const res = await fetch("/api/admin/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    }
    fetchBookings();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Bookings</h1>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Region</th>
            <th>Time</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.clientName}</td>
              <td>{b.email}</td>
              <td>{b.region}</td>
              <td>{b.time}</td>
              <td>{b.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
