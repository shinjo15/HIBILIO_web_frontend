import { z } from 'zod';
import messages from '../../../shared/message/message.json';

const routineNameSchema = z.string().trim()
  .min(1, messages.routineCreate.validation.routineNameRequired)
  .max(50, messages.routineCreate.validation.routineNameTooLong);

const routineMemoSchema = z.string().trim()
  .refine((value) => value === '' || value.length <= 300, messages.routineCreate.validation.routineMemoTooLong);

const actionNameSchema = z.string().trim()
  .min(1, messages.routineCreate.validation.actionNameRequired)
  .max(50, messages.routineCreate.validation.actionNameTooLong);

const actionMemoSchema = z.string().trim()
  .refine((value) => value === '' || value.length <= 300, messages.routineCreate.validation.actionMemoTooLong);

const optionalMinutesSchema = (integerMessage: string, minMessage: string) => z.string().trim()
  .refine((value) => value === '' || /^\d+$/.test(value), integerMessage)
  .refine((value) => value === '' || Number(value) >= 1, minMessage);

const routineExecutionMinutesSchema = optionalMinutesSchema(
  messages.routineCreate.validation.routineExecutionMinutesInteger,
  messages.routineCreate.validation.routineExecutionMinutesMin,
);

const actionMinutesSchema = optionalMinutesSchema(
  messages.routineCreate.validation.actionMinutesInteger,
  messages.routineCreate.validation.actionMinutesMin,
);

const optionalVideoUrlSchema = z.string().optional().transform((value) => value ?? '');

export const routineCreateActionSchema = z.object({
  actionMemo: actionMemoSchema,
  actionMinutes: actionMinutesSchema,
  actionName: actionNameSchema,
  parentRoutineActionIndex: z.number().int().nonnegative().optional(),
  videoUrl: optionalVideoUrlSchema,
});

export const routineCreateFormSchema = z.object({
  actions: z.array(routineCreateActionSchema).min(1, messages.routineCreate.validation.actionRequired),
  routineExecutionMinutes: routineExecutionMinutesSchema,
  routineMemo: routineMemoSchema,
  routineName: routineNameSchema,
  parentRoutineIdentifier: z.string().uuid().optional(),
  tagIdentifiers: z.array(z.string().uuid()).optional(),
  videoUrl: optionalVideoUrlSchema,
});

export const routineCreateActionRequestSchema = z.object({
  routine_action_minutes: z.number().int().min(1).optional(),
  routine_action_memo: z.string().min(1).max(300).optional(),
  routine_action_name: z.string().min(1).max(50),
  parent_routine_action_index: z.number().int().nonnegative().optional(),
  video_url: z.string().min(1).optional(),
});

export const routineCreateRequestSchema = z.object({
  routine_actions: z.array(routineCreateActionRequestSchema).min(1),
  routine_execution_minutes: z.number().int().min(1).optional(),
  routine_memo: z.string().min(1).max(300).optional(),
  routine_name: z.string().min(1).max(50),
  parent_routine_identifier: z.string().uuid().optional(),
  tag_identifiers: z.array(z.string().uuid()).optional(),
  video_url: z.string().min(1).optional(),
});

export type RoutineCreateActionViewModel = z.input<typeof routineCreateActionSchema> & {
  clientId?: string;
};
export type RoutineCreateViewModel = Omit<z.input<typeof routineCreateFormSchema>, 'actions'> & {
  actions: RoutineCreateActionViewModel[];
};
export type RoutineCreateRequest = z.infer<typeof routineCreateRequestSchema>;

let actionClientId = 0;

function createActionClientId(): string {
  actionClientId += 1;
  return `routine-create-action-${actionClientId}`;
}

export function ensureRoutineCreateActionClientIds(form: RoutineCreateViewModel): RoutineCreateViewModel {
  return {
    ...form,
    actions: form.actions.map((action) => ({
      ...action,
      clientId: action.clientId ?? createActionClientId(),
    })),
  };
}

export function createInitialRoutineCreateViewModel(): RoutineCreateViewModel {
  return {
    actions: [createEmptyAction()],
    routineExecutionMinutes: '',
    routineMemo: '',
    routineName: '',
    videoUrl: '',
  };
}

export function createEmptyAction(): RoutineCreateActionViewModel {
  return {
    actionMemo: '',
    actionMinutes: '',
    actionName: '',
    clientId: createActionClientId(),
    videoUrl: '',
  };
}

export function reorderRoutineCreateActions(
  actions: RoutineCreateActionViewModel[],
  fromIndex: number,
  toIndex: number,
): RoutineCreateActionViewModel[] {
  if (
    fromIndex < 0 ||
    fromIndex >= actions.length ||
    toIndex < 0 ||
    toIndex >= actions.length ||
    fromIndex === toIndex
  ) {
    return actions;
  }

  const reordered = [...actions];
  const [action] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, action);
  return reordered;
}

export function validateRoutineCreateForm(input: unknown) {
  return routineCreateFormSchema.safeParse(input);
}

export function toRoutineCreateViewModel(input: unknown): RoutineCreateViewModel {
  return routineCreateFormSchema.parse(input);
}

export function toRoutineCreateRequest(input: unknown): RoutineCreateRequest {
  const form = toRoutineCreateViewModel(input);
  const request: RoutineCreateRequest = {
    routine_actions: form.actions.map((action) => {
      const requestAction: RoutineCreateRequest['routine_actions'][number] = {
        routine_action_name: action.actionName,
      };

      if (action.actionMemo !== '') {
        requestAction.routine_action_memo = action.actionMemo;
      }

      if (action.actionMinutes !== '') {
        requestAction.routine_action_minutes = Number(action.actionMinutes);
      }

      if (action.parentRoutineActionIndex !== undefined) {
        requestAction.parent_routine_action_index = action.parentRoutineActionIndex;
      }

      if (action.videoUrl !== undefined && action.videoUrl !== '') {
        requestAction.video_url = action.videoUrl;
      }

      return requestAction;
    }),
    routine_name: form.routineName,
  };

  if (form.routineMemo !== '') {
    request.routine_memo = form.routineMemo;
  }

  if (form.routineExecutionMinutes !== '') {
    request.routine_execution_minutes = Number(form.routineExecutionMinutes);
  }

  if (form.parentRoutineIdentifier !== undefined) {
    request.parent_routine_identifier = form.parentRoutineIdentifier;
  }

  if (form.videoUrl !== undefined && form.videoUrl !== '') {
    request.video_url = form.videoUrl;
  }

  if (form.tagIdentifiers !== undefined && form.tagIdentifiers.length > 0) {
    request.tag_identifiers = form.tagIdentifiers;
  }

  return request;
}

export function createCustomizedRoutineViewModel(parent: {
  description: string;
  durationMinutes?: number;
  id: string;
  steps: Array<{ action: string; memo?: string; minutes?: number }>;
  title: string;
}): RoutineCreateViewModel {
  return {
    actions: parent.steps.map((step) => ({
      actionMemo: step.memo ?? '',
      actionMinutes: step.minutes?.toString() ?? '',
      actionName: step.action,
      clientId: createActionClientId(),
      videoUrl: '',
    })),
    parentRoutineIdentifier: parent.id,
    routineExecutionMinutes: parent.durationMinutes?.toString() ?? '',
    routineMemo: parent.description,
    routineName: parent.title,
    videoUrl: '',
  };
}
