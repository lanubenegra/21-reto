const DAY_IN_MS = 86_400_000;

const toDateStart = (value: string | Date): Date => {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export function currentDayFrom(startDate: string | Date, today: Date = new Date()): number {
  const start = toDateStart(startDate);
  const current = toDateStart(today);
  const diff = Math.floor((current.getTime() - start.getTime()) / DAY_IN_MS) + 1;
  return Math.min(21, Math.max(1, diff));
}

export function computeStreak(datesISO: string[], today: Date = new Date()): number {
  if (!datesISO.length) return 0;
  const normalized = new Set(
    datesISO
      .map((iso) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date.toISOString().slice(0, 10);
      })
      .filter((value): value is string => Boolean(value))
  );

  let streak = 0;
  const pointer = toDateStart(today);

  while (normalized.has(pointer.toISOString().slice(0, 10))) {
    streak += 1;
    pointer.setDate(pointer.getDate() - 1);
  }

  return streak;
}
