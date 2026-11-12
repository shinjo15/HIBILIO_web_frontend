import { z } from 'zod';
import { routineSchema, type Routine } from '../../routineFeed/domain/routine';
import { accountRoutineSchema, type AccountRoutine } from '../domain/account';
import type { PageResult } from '../../../shared/hooks/useInfiniteList';

const routinePostResponseSchema = z.object({
  account_identifier: z.string().min(1),
  account_name: z.string().min(1),
  customization_origin: z.object({
    account_name: z.string().min(1),
    icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
    routine_identifier: z.string().min(1),
    routine_name: z.string().min(1),
  }).nullable().optional(),
  icon_image_url: z.string().url().nullish().transform((url) => url ?? null),
  customization_count: z.number().int().nonnegative(),
  execution_count: z.number().int().nonnegative(),
  liked: z.boolean(),
  post_identifier: z.string().min(1),
  post_like_count: z.number().int().nonnegative(),
  post_support_count: z.number().int().nonnegative(),
  posted_at: z.string().datetime({ offset: true }),
  routine_execution_minutes: z.number().int().positive().nullable(),
  routine_identifier: z.string().min(1),
  routine_name: z.string().min(1),
  tags: z.array(z.object({
    tag_identifier: z.string().min(1),
    tag_name: z.string().min(1),
  })),
  routine_actions: z.array(z.object({
    action_minutes: z.number().int().positive().nullable(),
    action_name: z.string().min(1),
    routine_action_identifier: z.string().min(1),
  })),
});

const accountRoutinePostsResponseSchema = z.object({
  items: z.array(routinePostResponseSchema),
  total: z.number().int().nonnegative(),
});

const accountLikedRoutinePostsResponseSchema = z.object({
  items: z.array(routinePostResponseSchema.extend({
    liked_at: z.string().datetime({ offset: true }),
  })),
  total: z.number().int().nonnegative(),
});

const myPostResponseSchema = z.object({
  account_identifier: z.string().uuid(), account_name: z.string().min(1), customization_count: z.number().int().nonnegative(), execution_count: z.number().int().nonnegative(),
  icon_image_url: z.string().url().nullish().transform((url) => url ?? null), post_category: z.enum(['routine', 'action']).optional(), post_identifier: z.string().min(1), post_like_count: z.number().int().nonnegative(), posted_at: z.string().datetime({ offset: true }).nullable(),
  routine_actions: z.array(z.object({ action_minutes: z.number().int().positive().nullable(), action_name: z.string().min(1), routine_action_identifier: z.string().min(1) })),
  routine_execution_identifier: z.string().uuid().nullable().optional(), routine_execution_memo: z.string().nullable().optional(), routine_execution_minutes: z.number().int().positive().nullable(), routine_identifier: z.string().min(1), routine_name: z.string().min(1),
  tags: z.array(z.object({ tag_identifier: z.string().min(1), tag_name: z.string().min(1) })), liked: z.boolean().optional(), supported: z.boolean().optional(), support_count: z.number().int().nonnegative().optional(), executed_action_count: z.number().int().nonnegative().optional(), post_support_count: z.number().int().nonnegative().optional(),
  customization_origin: z.object({ account_name: z.string().min(1), icon_image_url: z.string().url().nullish().transform((url) => url ?? null), routine_identifier: z.string().min(1), routine_name: z.string().min(1) }).nullable().optional(),
});

const myPostsResponseSchema = z.object({ items: z.array(myPostResponseSchema), total: z.number().int().nonnegative() });
const myRoutineResponseSchema = myPostResponseSchema.extend({ liked: z.boolean().nullable(), post_identifier: z.string().min(1).nullable(), post_like_count: z.number().int().nonnegative().nullable(), post_support_count: z.number().int().nonnegative().nullable().optional(), posted_at: z.string().datetime({ offset: true }).nullable() });
const myRoutinesResponseSchema = z.object({ items: z.array(myRoutineResponseSchema), total: z.number().int().nonnegative() });
const executedRoutinesResponseSchema = z.object({ items: z.array(myRoutineResponseSchema.extend({ my_execution_count: z.number().int().nonnegative() })), total: z.number().int().nonnegative() });

function toRoutine(post: z.infer<typeof routinePostResponseSchema>): Routine {
  return routineSchema.parse({
    accountId: post.account_identifier,
    authorName: post.account_name,
    createdAt: post.posted_at,
    customizations: post.customization_count,
    ...(post.customization_origin !== undefined ? {
      customizationOrigin: post.customization_origin === null ? null : {
        accountName: post.customization_origin.account_name,
        iconImageUrl: post.customization_origin.icon_image_url,
        routineId: post.customization_origin.routine_identifier,
        routineName: post.customization_origin.routine_name,
      },
    } : {}),
    durationMinutes: post.routine_execution_minutes,
    executions: post.execution_count,
    id: post.post_identifier,
    iconImageUrl: post.icon_image_url,
    liked: post.liked,
    likes: post.post_like_count,
    routineId: post.routine_identifier,
    steps: post.routine_actions.map((action) => ({ action: action.action_name, durationMinutes: action.action_minutes })),
    supports: post.post_support_count,
    tags: post.tags.map((tag) => tag.tag_name),
    title: post.routine_name,
  });
}

function toMyPost(post: z.infer<typeof myPostResponseSchema>): AccountRoutine {
  const postCategory = post.post_category ?? 'routine';
  return accountRoutineSchema.parse({
    accountId: post.account_identifier, authorName: post.account_name, createdAt: post.posted_at, customizations: post.customization_count,
    ...(postCategory === 'routine' && post.customization_origin !== undefined ? { customizationOrigin: post.customization_origin === null ? null : { accountName: post.customization_origin.account_name, iconImageUrl: post.customization_origin.icon_image_url, routineId: post.customization_origin.routine_identifier, routineName: post.customization_origin.routine_name } } : {}),
    durationMinutes: post.routine_execution_minutes, executions: post.execution_count,
    ...(post.executed_action_count === undefined ? {} : { executedActionCount: post.executed_action_count }), ...(post.routine_execution_memo === undefined ? {} : { executionMemo: post.routine_execution_memo }),
    id: post.post_identifier, iconImageUrl: post.icon_image_url, liked: post.liked ?? null, likes: post.post_like_count, ...(post.post_category === undefined ? {} : { postCategory }), ...(post.routine_execution_identifier === undefined ? {} : { routineExecutionId: post.routine_execution_identifier }), routineId: post.routine_identifier,
    steps: post.routine_actions.map((action) => ({ action: action.action_name, durationMinutes: action.action_minutes })), ...(post.supported === undefined ? {} : { supported: post.supported }), ...(post.support_count === undefined ? {} : { supportCount: post.support_count }), ...(post.post_support_count === undefined ? {} : { supports: post.post_support_count }), tags: post.tags.map((tag) => tag.tag_name), title: post.routine_name,
  });
}

function toMyRoutine(routine: z.infer<typeof myRoutineResponseSchema> & { my_execution_count?: number }): AccountRoutine {
  return {
    accountId: routine.account_identifier, authorName: routine.account_name, createdAt: routine.posted_at, customizations: routine.customization_count,
    ...(routine.customization_origin === undefined ? {} : { customizationOrigin: routine.customization_origin === null ? null : { accountName: routine.customization_origin.account_name, iconImageUrl: routine.customization_origin.icon_image_url, routineId: routine.customization_origin.routine_identifier, routineName: routine.customization_origin.routine_name } }),
    durationMinutes: routine.routine_execution_minutes, executions: routine.execution_count, id: routine.post_identifier, iconImageUrl: routine.icon_image_url, liked: routine.liked, likes: routine.post_like_count, ...(routine.my_execution_count === undefined ? {} : { myExecutionCount: routine.my_execution_count }), routineId: routine.routine_identifier,
    steps: routine.routine_actions.map((action) => ({ action: action.action_name, durationMinutes: action.action_minutes })), ...(routine.post_support_count === null || routine.post_support_count === undefined ? {} : { supports: routine.post_support_count }), tags: routine.tags.map((tag) => tag.tag_name), title: routine.routine_name,
  };
}

export function parseAccountPosts(response: unknown): Routine[] {
  return parseAccountPostsPage(response).items;
}

export function parseLikedRoutines(response: unknown): Routine[] {
  return parseLikedRoutinesPage(response).items;
}

export function parseAccountPostsPage(response: unknown): PageResult<Routine> {
  const parsed = accountRoutinePostsResponseSchema.parse(response);
  return { items: parsed.items.map(toRoutine), total: parsed.total };
}

export function parseMyPostsPage(response: unknown): PageResult<AccountRoutine> {
  const parsed = myPostsResponseSchema.parse(response);
  return { items: parsed.items.map(toMyPost), total: parsed.total };
}

export function parseMyRoutinesPage(response: unknown): PageResult<AccountRoutine> {
  const parsed = myRoutinesResponseSchema.parse(response);
  return { items: parsed.items.map(toMyRoutine), total: parsed.total };
}

export function parseExecutedRoutinesPage(response: unknown): PageResult<AccountRoutine> {
  const parsed = executedRoutinesResponseSchema.parse(response);
  return { items: parsed.items.map(toMyRoutine), total: parsed.total };
}

export function parseLikedRoutinesPage(response: unknown): PageResult<Routine> {
  const parsed = accountLikedRoutinePostsResponseSchema.parse(response);
  return { items: parsed.items.map(toRoutine), total: parsed.total };
}
