import Link from 'next/link';

export default function CTAButton({ href='/booking', children='Book a Good2Go Assessment', className }) {
  return (
    <Link href={href}
      className={`inline-block px-6 py-3 rounded-xl bg-black text-white hover:opacity-90 ${className || ''}`}>
      {children}
    </Link>
  );
}
