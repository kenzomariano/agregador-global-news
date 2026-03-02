/**
 * Estimates reading time for a given text content.
 * Average reading speed: ~200 words per minute for Portuguese.
 */
export function estimateReadingTime(content: string | null | undefined): number {
  if (!content) return 0;
  const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const wordCount = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}
