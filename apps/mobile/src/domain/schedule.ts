import type { TimeSlot } from "../types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextWeekday(from: Date, weekday: number): Date {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + (delta === 0 ? 7 : delta));
  return date;
}

export function proposeSlots(now = new Date()): TimeSlot[] {
  const targets = [
    { day: 2, id: "tue-10", label: "Tuesday 10:00 am" },
    { day: 3, id: "wed-1430", label: "Wednesday 2:30 pm" },
    { day: 4, id: "thu-9", label: "Thursday 9:00 am" },
  ];

  return targets.map((target) => {
    const date = nextWeekday(now, target.day);
    return {
      id: target.id,
      label: target.label,
      detail: date.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    };
  });
}
