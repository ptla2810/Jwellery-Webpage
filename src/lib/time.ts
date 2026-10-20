/** Time helpers kept outside components so render logic stays pure and testable. */
export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * 86_400_000);
}

export function isWithinDays(date: Date, days: number, now: Date = new Date()): boolean {
  return now.getTime() - date.getTime() < days * 86_400_000;
}
