export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
