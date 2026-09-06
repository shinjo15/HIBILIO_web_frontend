export type EditableProfile = {
  bio: string;
  handle: string;
  headerImageName: string | null;
  iconImageName: string | null;
  name: string;
  socialLinks: Array<{ socialType: string; socialUrl: string }>;
};

const initialProfile: EditableProfile = {
  bio: '夜のルーティンで睡眠の質を改善中。毎日続けることが目標。',
  handle: 'yuki_sleep',
  headerImageName: null,
  iconImageName: null,
  name: '山田 由紀',
  socialLinks: [{ socialType: 'x', socialUrl: 'https://x.com/yuki_sleep' }],
};

export async function loadEditableProfile(): Promise<EditableProfile> {
  return initialProfile;
}

export async function saveEditableProfile(profile: EditableProfile): Promise<void> {
  void profile;
}
