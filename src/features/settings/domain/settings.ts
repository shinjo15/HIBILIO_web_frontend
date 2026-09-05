export type Settings = {
  isDarkMode: boolean;
  isLikeNotificationEnabled: boolean;
  isPrivateAccount: boolean;
  isSupportNotificationEnabled: boolean;
};

export const defaultSettings: Settings = {
  isDarkMode: false,
  isLikeNotificationEnabled: true,
  isPrivateAccount: false,
  isSupportNotificationEnabled: true,
};
