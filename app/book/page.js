'use client';
import { useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const REGIONS = [
  { id: 'auckland', label: 'Auckland' },
  { id: 'waikato', label: 'Waikato' },
  { id: 'bop', label: 'Bay of Plenty' },
];

const TIMESLOTS = {
  auckland: ['Tue 5:30–6:30pm'],
  waikato: ['Tue 5:30–6:30pm'],
  bop: ['Thu 11:00am–12:00pm'],
};

function genRef(prefix='G2G') {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export default function BookPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    region: 'auckland',
    slot: '',
    venue: '',
    referringName: '',
    consentAccepted: false,
    consentDuration: 'Until Revoked'
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const slots = useMemo(() => TIMESLOTS[form.region] || [], [form.region]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.region || !form.slot || !form.venue || !form.referringName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!form.consentAccepted) {
      setError('You must accept the privacy/consent terms to proceed.');
      return;
    }
    setSubmitting(true);
    try {
      const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');
      const payload = {
        clientName: form.name,
        email: form.email,
        phone: form.phone || '',
        region: REGIONS.find(r => r.id === form.region)?.label || form.region,
        date: form.slot.split(' ')[0] || 'TBD',
        time: form.slot,
        venue: form.venue,
        referringProfessional: { name: form.referringName },
        consent: {
          accepted: true,
          acceptedAt: new Date(),
          duration: form.consentDuration
        },
        createdAt: serverTimestamp(),
        bookingRef
      };
      const docRef = await addDoc(collection(db, 'bookings'), payload);
      setResult({ bookingRef, id: docRef.id });
    } catch (err) {
      console.error(err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{maxWidth:780, margin:'40px auto', padding:'0 20px'}}>
      <h1>Book a Good2Go Session</h1>
      <p>Stage 1: booking capture (payment is disabled in this module).</p>

      {result ? (
        <div style={{background:'#ECFDF5', border:'1px solid #10B981', padding:16, borderRadius:8}}>
          <h3>✅ Booking received</h3>
          <p><b>Reference:</b> {result.bookingRef}</p>
          <p>We’ve emailed a confirmation. You can close this page.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{display:'grid', gap:12, marginTop:16}}>
          <div>
            <label>Name*</label><br/>
            <input name="name" value={form.name} onChange={onChange} required style={{width:'100%'}}/>
          </div>
          <div>
            <label>Email*</label><br/>
            <input name="email" type="email" value={form.email} onChange={onChange} required style={{width:'100%'}}/>
          </div>
          <div>
            <label>Phone</label><br/>
            <input name="phone" value={form.phone} onChange={onChange} style={{width:'100%'}}/>
          </div>
          <div>
            <label>Region*</label><br/>
            <select name="region" value={form.region} onChange={onChange} required>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label>Time slot*</label><br/>
            <select name="slot" value={form.slot} onChange={onChange} required>
              <option value="">Select…</option>
              {slots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Venue address*</label><br/>
            <input name="venue" value={form.venue} onChange={onChange} required style={{width:'100%'}} placeholder="Address of session"/>
          </div>
          <div>
            <label>Referring professional name*</label><br/>
            <input name="referringName" value={form.referringName} onChange={onChange} required style={{width:'100%'}}/>
          </div>

          <fieldset style={{border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
            <legend>Privacy & Consent</legend>
            <label style={{display:'flex', gap:8, alignItems:'center'}}>
              <input type="checkbox" name="consentAccepted" checked={form.consentAccepted} onChange={onChange} />
              I confirm I have read the Privacy/Consent document and agree to share test results for clinical purposes.
            </label>
            <small>Duration: {form.consentDuration}</small>
          </fieldset>

          {error && <div style={{color:'#B91C1C'}}>{error}</div>}

          <button type="submit" disabled={submitting} style={{padding:'10px 14px'}}>
            {submitting ? 'Submitting…' : 'Confirm Booking'}
          </button>
        </form>
      )}
    </main>
  );
}
