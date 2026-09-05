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

export const routineCreateActionSchema = z.object({
  actionMemo: actionMemoSchema,
  actionMinutes: actionMinutesSchema,
  actionName: actionNameSchema,
});

export const routineCreateFormSchema = z.object({
  actions: z.array(routineCreateActionSchema).min(1, messages.routineCreate.validation.actionRequired),
  routineExecutionMinutes: routineExecutionMinutesSchema,
  routineMemo: routineMemoSchema,
  routineName: routineNameSchema,
});

export const routineCreateActionRequestSchema = z.object({
  routine_action_minutes: z.number().int().min(1).optional(),
  routine_action_memo: z.string().min(1).max(300).optional(),
  routine_action_name: z.string().min(1).max(50),
});

export const routineCreateRequestSchema = z.object({
  routine_actions: z.array(routineCreateActionRequestSchema).min(1),
  routine_execution_minutes: z.number().int().min(1).optional(),
  routine_memo: z.string().min(1).max(300).optional(),
  routine_name: z.string().min(1).max(50),
});

export type RoutineCreateActionViewModel = z.infer<typeof routineCreateActionSchema>;
export type RoutineCreateViewModel = z.infer<typeof routineCreateFormSchema>;
export type RoutineCreateRequest = z.infer<typeof routineCreateRequestSchema>;

export function createInitialRoutineCreateViewModel(): RoutineCreateViewModel {
  return {
    actions: [createEmptyAction()],
    routineExecutionMinutes: '',
    routineMemo: '',
    routineName: '',
  };
}

export function createEmptyAction(): RoutineCreateActionViewModel {
  return {
    actionMemo: '',
    actionMinutes: '',
    actionName: '',
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

  return request;
}
