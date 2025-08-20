export function middleware(req) {
  const basicAuth = req.headers.get('authorization')
  const username = process.env.STAGING_USERNAME
  const password = process.env.STAGING_PASSWORD

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = Buffer.from(authValue, 'base64').toString().split(':')
    if (user === username && pwd === password) {
      return
    }
  }
  return new Response('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  })
}

export const config = {
  matcher: ['/', '/api/:path*'],
}
