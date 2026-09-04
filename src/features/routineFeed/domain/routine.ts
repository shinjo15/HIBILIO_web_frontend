import { z } from 'zod';

export const routineStepSchema = z.object({
  action: z.string().min(1),
  duration: z.string().optional(),
  time: z.string().min(1),
});

export const routineSchema = z.object({
  author: z.object({
    handle: z.string().min(1),
    name: z.string().min(1),
  }),
  createdAt: z.string().datetime(),
  customizations: z.number().int().nonnegative(),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  executions: z.number().int().nonnegative(),
  id: z.string().min(1),
  liked: z.boolean(),
  likes: z.number().int().nonnegative(),
  steps: z.array(routineStepSchema).min(1),
  tags: z.array(z.string().min(1)).max(5),
  title: z.string().min(1),
});

export const routineListSchema = z.array(routineSchema);

export type Routine = z.infer<typeof routineSchema>;
export type RoutineStep = z.infer<typeof routineStepSchema>;
export type RoutineFeedTab = 'recommended' | 'popular' | 'recent';

export function sortRoutines(routines: Routine[], tab: RoutineFeedTab): Routine[] {
  const sorted = [...routines];

  if (tab === 'popular') {
    return sorted.sort((a, b) => b.likes - a.likes);
  }

  if (tab === 'recent') {
    return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return sorted;
}

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
