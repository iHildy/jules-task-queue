export function getNextScheduledTime(now: Date): Date {
  const anHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  return anHourFromNow;
}
