// app/api/book/route.js
import { NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getApps, initializeApp } from 'firebase-admin/app'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdminDb() {
  if (!getApps().length) {
    initializeApp()
  }
  return getFirestore()
}

function genRef(prefix = 'G2G') {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const rand = Math.random().toString(36).slice(2,5).toUpperCase()
  return `${prefix}-${stamp}-${rand}`
}

export async function POST(req) {
  try {
    const body = await req.json()

    const isPackage = body?.product === 'package' || body?.isPackage === true
    const amount = isPackage ? 19900 : 6500 // cents

    const bookingRef = genRef('G2G')

    const db = getAdminDb()
    const docRef = db.collection('bookings').doc()
    await docRef.set({
      bookingRef,
      createdAt: FieldValue.serverTimestamp(),
      status: 'pending',
      ...body,
      amount,
      currency: process.env.WORLDLINE_CURRENCY || process.env.NEXT_PUBLIC_WORLDLINE_CURRENCY || 'NZD',
    })

    const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN
    const base = origin || `https://${req.headers.get('host')}`
    const r = await fetch(`${base}/api/worldline/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: bookingRef, amount }),
      cache: 'no-store',
    }).catch(() => null)

    let redirectUrl = ''
    if (r && r.ok) {
      const j = await r.json()
      if (j?.ok && j?.redirectUrl) redirectUrl = j.redirectUrl
    }

    if (!redirectUrl) {
      return NextResponse.json({ ok:false, bookingRef, error:'no redirectUrl from WPRequest' }, { status: 502 })
    }

    return NextResponse.json({ ok:true, bookingRef, redirectUrl })
  } catch (e) {
    return NextResponse.json({ ok:false, error: e?.message || 'unhandled' }, { status:500 })
  }
}
