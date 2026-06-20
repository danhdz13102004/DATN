export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  COMPANIES: '/companies',
  JOBS: '/jobs',
  JOB_SEARCH_SYNC: '/job-search-sync',
  APPLICATIONS: '/applications',
  SKILLS: '/skills',
  SUBSCRIPTIONS: '/subscriptions',
  PAYMENTS: '/payments',
  AUDIT_LOGS: '/audit-logs',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
} as const;

export const AUTH_STRINGS = {
  LOGIN_TITLE: 'Admin Panel',
  LOGIN_SUBTITLE: 'RecruitPro Administration',
  LOGIN_BUTTON: 'Sign In',
  EMAIL_LABEL: 'Email Address',
  PASSWORD_LABEL: 'Password',
  REMEMBER_ME: 'Remember me',
  FORGOT_LINK: 'Forgot password?',
  REQUIRED: '*',
} as const;
