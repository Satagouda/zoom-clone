// Utility helpers
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a date string to a human-readable format.
 * Wraps date-fns for consistent formatting across the app.
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Generate a random meeting ID in the format: abc-defg-hij
 */
export function generateMeetingId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segment = (len: number) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${segment(3)}-${segment(4)}-${segment(3)}`;
}
