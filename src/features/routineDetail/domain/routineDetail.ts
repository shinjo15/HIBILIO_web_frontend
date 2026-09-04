import { z } from 'zod';
import { formatDuration } from '../../routineFeed/domain/routine';

export const routineDetailStepDtoSchema = z.object({
  action: z.string().min(1),
  duration: z.string().optional(),
  time: z.string().min(1),
});

export const executionPostDtoSchema = z.object({
  achieved: z.number().int().nonnegative(),
  avatar: z.string().min(1),
  cheers: z.number().int().nonnegative(),
  comment: z.string().optional(),
  date: z.string().min(1),
  id: z.string().min(1),
  minutes: z.number().int().positive(),
  routineId: z.string().min(1),
  total: z.number().int().positive(),
  userHandle: z.string().min(1),
  userName: z.string().min(1),
});

export const customizationDtoSchema = z.object({
  authorHandle: z.string().min(1),
  description: z.string().min(1),
  id: z.string().min(1),
  routineId: z.string().min(1),
  title: z.string().min(1),
});

export const routineDetailDtoSchema = z.object({
  author: z.object({
    handle: z.string().min(1),
    name: z.string().min(1),
  }),
  customizations: z.number().int().nonnegative(),
  customizationsList: z.array(customizationDtoSchema),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  executions: z.number().int().nonnegative(),
  executionPosts: z.array(executionPostDtoSchema),
  id: z.string().min(1),
  liked: z.boolean(),
  likes: z.number().int().nonnegative(),
  steps: z.array(routineDetailStepDtoSchema).min(1),
  tags: z.array(z.string().min(1)).max(5),
  title: z.string().min(1),
});

export type RoutineDetailDto = z.infer<typeof routineDetailDtoSchema>;

export type RoutineDetailViewModel = {
  author: RoutineDetailDto['author'] & { initial: string };
  customizations: number;
  description: string;
  duration: string;
  executions: number;
  executionPosts: Array<{
    achieved: number;
    avatar: string;
    cheers: number;
    comment?: string;
    date: string;
    id: string;
    minutes: number;
    total: number;
    userHandle: string;
    userName: string;
  }>;
  id: string;
  liked: boolean;
  likes: number;
  steps: RoutineDetailDto['steps'];
  tags: string[];
  title: string;
  customizationsList: Array<{
    authorHandle: string;
    description: string;
    id: string;
    title: string;
  }>;
};

export function toRoutineDetailViewModel(input: unknown): RoutineDetailViewModel {
  const dto = routineDetailDtoSchema.parse(input);

  return {
    author: {
      ...dto.author,
      initial: dto.author.handle.slice(0, 1).toUpperCase(),
    },
    customizations: dto.customizations,
    customizationsList: dto.customizationsList.map(({ authorHandle, description, id, title }) => ({
      authorHandle,
      description,
      id,
      title,
    })),
    description: dto.description,
    duration: formatDuration(dto.durationMinutes),
    executions: dto.executions,
    executionPosts: dto.executionPosts.map((post) => ({
      achieved: post.achieved,
      avatar: post.avatar,
      cheers: post.cheers,
      comment: post.comment,
      date: post.date,
      id: post.id,
      minutes: post.minutes,
      total: post.total,
      userHandle: post.userHandle,
      userName: post.userName,
    })),
    id: dto.id,
    liked: dto.liked,
    likes: dto.likes,
    steps: dto.steps,
    tags: dto.tags,
    title: dto.title,
  };
}
