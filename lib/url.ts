export function absFromReqOrigin(origin: string | null | undefined, pathOrUrl: string): string {
  try {
    // Already absolute?
    new URL(pathOrUrl);
    return pathOrUrl;
  } catch {}
  const base = (origin && origin.trim()) || '';
  // basic guard if origin missing—fallback to https://good2go-rth.com
  const baseSafe = base || 'https://good2go-rth.com';
  try {
    return new URL(pathOrUrl, baseSafe).toString();
  } catch {
    return `${baseSafe.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`;
  }
}
