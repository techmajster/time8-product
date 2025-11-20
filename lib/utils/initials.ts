export function getInitials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
