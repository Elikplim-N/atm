// Reconstructs the public origin (scheme + host) a request came in on,
// respecting the forwarding headers Vercel/most proxies set. Used to build
// absolute URLs (QR feedback links, SMS delivery callbacks) that work the
// same whether the app is running locally or deployed.
export function getRequestOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return host ? `${proto}://${host}` : null;
}
