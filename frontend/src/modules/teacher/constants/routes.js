/**
 * Application Routes Configuration
 */
export const ROUTES = {
  LOGIN: '/teacher/login',
  REGISTRATION: '/registration',
  FINAL_OTP: '/teacher/final-otp',
  DASHBOARD: '/teacher/dashboard',
  ATTENDANCE: '/teacher/attendance',
  LIVE_CLASSES: '/teacher/live-classes',
  CREATE_LIVE_CLASS: '/teacher/create-live-class',
  EDIT_LIVE_CLASS: '/teacher/edit-live-class/:classId',
  DOUBTS: '/teacher/doubts',
  PROFILE: '/teacher/profile',
  PERSONAL_INFORMATION: '/teacher/personal-information',
  EDIT_PROFILE: '/edit-profile',
  NOTIFICATIONS: '/teacher/notifications',
  QUIZZES: '/teacher/quizzes',
  ADD_QUIZ: '/teacher/quizzes/add',
  EDIT_QUIZ: '/teacher/quizzes/edit/:id',
  VIEW_QUIZ: '/teacher/quizzes/:id',
  QUIZ_RESULTS: '/teacher/quizzes/:id/results',
  // Agent Routes
  AGENT_DASHBOARD: '/teacher/agent/dashboard',
  AGENT_STATISTICS: '/teacher/agent/statistics',
  AGENT_REFERRALS: '/teacher/agent/referrals',
  AGENT_PROFILE: '/teacher/agent/profile',
  AGENT_BANK_DETAILS: '/teacher/agent/bank-details',
  AGENT_NOTIFICATIONS: '/teacher/agent/notifications',
};

