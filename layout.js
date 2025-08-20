export const metadata = {
  title: 'Good2Go Staging',
  description: 'Staging placeholder for Good2Go website',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
