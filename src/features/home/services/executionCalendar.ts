type CalendarMonth = { month: number; year: number };

type ExecutionWithDate = { id: string; postedAt: string | null };

type CalendarDay = CalendarMonth & { day: number; key: string };

const weekdays = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function groupExecutionHistoriesByLocalDate<Execution extends ExecutionWithDate>(histories: Execution[]) {
  const dated = new Map<string, Execution[]>();
  const undated: Execution[] = [];

  histories.forEach((history) => {
    if (history.postedAt === null) {
      undated.push(history);
      return;
    }

    const date = new Date(history.postedAt);
    const key = dateKey(date);
    dated.set(key, [...(dated.get(key) ?? []), history]);
  });

  return { dated, undated };
}

export function shiftCalendarMonth({ month, year }: CalendarMonth, amount: number): CalendarMonth {
  const date = new Date(year, month - 1 + amount, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function buildCalendarMonth({ month, year }: CalendarMonth) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: Array<CalendarDay | null> = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, key: `${year}-${month}-${index + 1}`, month, year })),
  ];

  return { days, weekdays };
}

export function isCalendarDayToday(day: CalendarDay, today: Date) {
  return day.year === today.getFullYear()
    && day.month === today.getMonth() + 1
    && day.day === today.getDate();
}

export function isCalendarDayFuture(day: CalendarDay, today: Date) {
  return day.year > today.getFullYear()
    || (day.year === today.getFullYear() && (day.month > today.getMonth() + 1
      || (day.month === today.getMonth() + 1 && day.day > today.getDate())));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
