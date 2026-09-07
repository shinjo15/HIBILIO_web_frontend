export type RegistrationTag = {
  identifier: string;
  label: string;
};

export const registrationTags: readonly RegistrationTag[] = [
  { identifier: '20000000-0000-4000-8000-000000000001', label: '朝活' },
  { identifier: '20000000-0000-4000-8000-000000000002', label: '集中' },
  { identifier: '20000000-0000-4000-8000-000000000003', label: '運動' },
  { identifier: '20000000-0000-4000-8000-000000000004', label: 'リラックス' },
];
