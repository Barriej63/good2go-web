export function weekdayToNumber(w: string | number | null | undefined): number | null {
  if (w === null || w === undefined) return null;
  if (typeof w === 'number') return Math.max(0, Math.min(6, w));
  const s = String(w).trim().toLowerCase();
  const map: Record<string, number> = {
    'sun': 0, 'sunday': 0,
    'mon': 1, 'monday': 1,
    'tue': 2, 'tues': 2, 'tuesday': 2,
    'wed': 3, 'wednesday': 3,
    'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6
  };
  return map.hasOwnProperty(s) ? map[s] : null;
}
