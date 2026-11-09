import { describe, expect, it } from 'vitest';
import { buildCalendarMonth, groupExecutionHistoriesByLocalDate, shiftCalendarMonth } from './executionCalendar';

describe('executionCalendar', () => {
  it('posted_at がある履歴をブラウザのローカル日付で月間カレンダーに配置し、複数件の順序を保つ', () => {
    const result = groupExecutionHistoriesByLocalDate([
      { id: 'first', postedAt: '2026-03-05T09:00:00+09:00' },
      { id: 'second', postedAt: '2026-03-05T12:00:00+09:00' },
    ]);
    const localDate = new Date('2026-03-05T09:00:00+09:00');
    const localKey = `${localDate.getFullYear()}-${localDate.getMonth() + 1}-${localDate.getDate()}`;

    expect(result.dated.get(localKey)?.map((history) => history.id)).toEqual(['first', 'second']);
    expect(result.undated).toEqual([]);
  });

  it('posted_at が null の履歴は日付を推測せず別枠に残す', () => {
    const result = groupExecutionHistoriesByLocalDate([
      { id: 'undated', postedAt: null },
    ]);

    expect(result.dated).toEqual(new Map());
    expect(result.undated.map((history) => history.id)).toEqual(['undated']);
  });

  it('posted_at の日境界はブラウザのローカル日付で配置する', () => {
    const postedAt = '2026-03-01T00:30:00+09:00';
    const date = new Date(postedAt);
    const result = groupExecutionHistoriesByLocalDate([{ id: 'boundary', postedAt }]);
    const localKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    expect(result.dated.get(localKey)?.map((history) => history.id)).toEqual(['boundary']);
  });

  it('月移動は年をまたいでもローカル月を正しく返す', () => {
    expect(shiftCalendarMonth({ month: 12, year: 2026 }, 1)).toEqual({ month: 1, year: 2027 });
    expect(shiftCalendarMonth({ month: 1, year: 2027 }, -1)).toEqual({ month: 12, year: 2026 });
  });

  it('日曜始まりの月間グリッドに曜日と月内の日付を並べる', () => {
    const calendar = buildCalendarMonth({ month: 3, year: 2026 });

    expect(calendar.weekdays).toEqual(['日', '月', '火', '水', '木', '金', '土']);
    expect(calendar.days.filter((day) => day !== null).map((day) => day?.day)).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
  });
});
