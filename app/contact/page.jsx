export const metadata = {
  title: 'Contact — Good2Go',
  description: 'Get in touch with the Good2Go team.',
};

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="mt-4 text-gray-700">
        Email us at <a className="underline" href="mailto:help@good2go-rth.com">help@good2go-rth.com</a>.
      </p>
    </main>
  );
}
