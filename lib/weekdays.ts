export const WEEKDAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

export function toWeekdayNumber(v: any): number | null {
  if (v === null || typeof v === 'undefined') return null;
  if (typeof v === 'number') return (v >= 0 && v <= 6) ? v : null;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    // accept short names too
    const map: Record<string, number> = {
      'sun':0,'sunday':0,
      'mon':1,'monday':1,
      'tue':2,'tues':2,'tuesday':2,
      'wed':3,'weds':3,'wednesday':3,
      'thu':4,'thur':4,'thurs':4,'thursday':4,
      'fri':5,'friday':5,
      'sat':6,'saturday':6,
    };
    return map[s] ?? null;
  }
  return null;
}
