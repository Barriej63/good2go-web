export default function Section({ id, title, subtitle, children, className }) {
  return (
    <section id={id} className={`py-12 sm:py-16 ${className || ''}`}>
      <div className="max-w-5xl mx-auto px-4">
        {title && <h2 className="text-2xl sm:text-3xl font-semibold">{title}</h2>}
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
