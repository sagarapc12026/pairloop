import { format, isToday, isTomorrow, isYesterday, isThisYear, differenceInCalendarDays, startOfDay } from "date-fns";

export function dueLabel(iso: string, hasTime: boolean) {
  const d = new Date(iso);
  const time = hasTime ? format(d, "h:mm a").replace(":00", "") : "";
  let day: string;
  if (isToday(d)) day = "Today";
  else if (isTomorrow(d)) day = "Tomorrow";
  else if (isYesterday(d)) day = "Yesterday";
  else {
    const diff = differenceInCalendarDays(d, new Date());
    day = diff > 0 && diff < 7 ? format(d, "EEEE") : format(d, isThisYear(d) ? "EEE, MMM d" : "MMM d, yyyy");
  }
  return time ? `${day}, ${time}` : day;
}

export function isOverdue(iso: string | null, hasTime: boolean) {
  if (!iso) return false;
  const d = new Date(iso);
  return hasTime ? d.getTime() < Date.now() : d < startOfDay(new Date());
}

/** Value helpers for <input type="date|time"> in local time. */
export const toDateInput = (d: Date) => format(d, "yyyy-MM-dd");
export const toTimeInput = (d: Date) => format(d, "HH:mm");
export function fromInputs(date: string, time: string | null) {
  if (!date) return null;
  const [y, m, dd] = date.split("-").map(Number);
  const out = new Date(y, m - 1, dd, 0, 0, 0, 0);
  if (time) {
    const [h, mi] = time.split(":").map(Number);
    out.setHours(h, mi);
  }
  return out;
}
