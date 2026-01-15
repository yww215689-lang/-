
export const APP_STORAGE_KEY = 'smart_brush_app_data_v1';

export const SUBJECTS = {
  PRACTICE: '消防安全技术实务',
  ABILITY: '消防安全技术综合能力',
  CASE: '消防安全案例分析'
} as const;

export const DEFAULT_SUBJECT = SUBJECTS.PRACTICE;

// Removed API Key constants as we are now using local recognition.
