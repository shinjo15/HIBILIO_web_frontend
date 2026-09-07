import { z } from 'zod';

export const routineStepSchema = z.object({
  action: z.string().min(1),
  durationMinutes: z.number().int().positive().nullable(),
});

export const routineSchema = z.object({
  authorName: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  customizations: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive().nullable(),
  executions: z.number().int().nonnegative(),
  id: z.string().min(1),
  liked: z.boolean(),
  likes: z.number().int().nonnegative(),
  routineId: z.string().min(1),
  steps: z.array(routineStepSchema),
  supports: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().min(1)),
  title: z.string().min(1),
});

export type Routine = z.infer<typeof routineSchema>;
export type RoutineStep = z.infer<typeof routineStepSchema>;
export type RoutineFeedTab = 'following' | 'recommended' | 'popular';

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}時間` : `${hours}時間${remainingMinutes}分`;
}

export function formatPostedAt(createdAt: string, now = new Date()): string {
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000));

  if (elapsedMinutes < 60) {
    return `${Math.max(1, elapsedMinutes)}分前`;
  }

  if (elapsedMinutes < 60 * 24) {
    return `${Math.floor(elapsedMinutes / 60)}時間前`;
  }

  const elapsedDays = Math.floor(elapsedMinutes / (60 * 24));
  return elapsedDays === 1 ? '昨日' : `${elapsedDays}日前`;
}