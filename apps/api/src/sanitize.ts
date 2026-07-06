export function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, '');
}
