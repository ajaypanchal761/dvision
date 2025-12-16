// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('[Teacher API] Using VITE_API_BASE_URL from env:', cleanUrl);
    return cleanUrl;
  }

  // Auto-detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname.includes('dvisionacademy.com');

    if (isProduction) {
      // Try api subdomain first, fallback to same domain
      const protocol = window.location.protocol;
      let apiUrl;
      if (hostname.startsWith('www.')) {
        apiUrl = `${protocol}//api.${hostname.substring(4)}/api`;
      } else if (!hostname.startsWith('api.')) {
        apiUrl = `${protocol}//api.${hostname}/api`;
      } else {
        apiUrl = `${protocol}//${hostname}/api`;
      }
      console.log('[Teacher API] Production detected. Hostname:', hostname, '→ API URL:', apiUrl);
      return apiUrl;
    } else {
      console.log('[Teacher API] Development mode. Hostname:', hostname);
    }
  }

  // Default to localhost for development
  const defaultUrl = 'http://localhost:5000/api';
  console.log('[Teacher API] Using default API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('[Teacher API] Final API_BASE_URL:', API_BASE_URL);
// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('dvision_token');
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const config = {
    ...options,
    headers: {
      // Don't set Content-Type for FormData, browser will set it with boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  };

  // Add body if provided
  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  // Define fullUrl before try block to ensure it's available in catch
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';

  try {

    console.log(`[Teacher API] ${method} Request:`, {
      endpoint,
      fullUrl,
      hasToken: !!token,
      hasBody: !!options.body,
      isFormData,
      hasSignal: !!options.signal
    });

    if (options.body && typeof options.body === 'object' && !isFormData) {
      console.log('[Teacher API] Request Body:', options.body);
    }

    // Add signal to config if provided (for timeout handling)
    if (options.signal) {
      config.signal = options.signal;
    }

    console.log('[Teacher API] Sending request to:', fullUrl);
    const response = await fetch(fullUrl, config);
    console.log('[Teacher API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    // Check if response is ok
    if (!response.ok) {
      // Try to parse error message
      let errorMessage = 'Something went wrong';
      let errorData = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('[Teacher API] Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage
        });
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
        console.error('[Teacher API] Error parsing response:', parseError);
        console.error('[Teacher API] Error Response (non-JSON):', {
          status: response.status,
          statusText: response.statusText,
          errorMessage
        });
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      // Attach full error data for detailed error handling
      if (errorData) {
        error.data = errorData.data || errorData;
        error.errors = errorData.data?.errors || errorData.errors;
      }
      throw error;
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('[Teacher API] Success Response:', {
        endpoint,
        success: data.success,
        hasData: !!data.data
      });
      return data;
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.log('[Teacher API] Success Response (non-JSON):', {
        endpoint,
        contentType,
        textLength: text.length
      });
      return { success: true, data: text };
    }
  } catch (error) {
    // Handle abort/timeout errors
    if (error.name === 'AbortError' || (options.signal && options.signal.aborted)) {
      console.error('[Teacher API] Request Timeout:', {
        endpoint,
        fullUrl,
        error: error.message
      });
      throw new Error('Request timeout. The upload is taking too long. Please try again.');
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('[Teacher API] Network Error:', {
        endpoint,
        fullUrl,
        error: error.message,
        errorName: error.name,
        stack: error.stack
      });

      // Provide more helpful error message for uploads
      if (endpoint.includes('upload-recording')) {
        throw new Error('Network error while uploading recording. Please check your internet connection and try again. If the file is very large, it may take several minutes to upload.');
      }

      throw new Error('Network error. Please check if the server is running.');
    }
    console.error('[Teacher API] Request Error:', {
      endpoint,
      fullUrl,
      error: error.message,
      errorName: error.name,
      status: error.status,
      stack: error.stack
    });
    throw error;
  }
};

// Teacher API
export const teacherAPI = {
  // Check if teacher exists
  checkTeacherExists: async (phone) => {
    return apiRequest(`/teacher/check/${encodeURIComponent(phone)}`, {
      method: 'GET',
    });
  },

  // Send OTP
  sendOTP: async (phone) => {
    return apiRequest('/teacher/send-otp', {
      method: 'POST',
      body: { phone },
    });
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    return apiRequest('/teacher/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    });
  },

  // Resend OTP
  resendOTP: async (phone) => {
    return apiRequest('/teacher/resend-otp', {
      method: 'POST',
      body: { phone },
    });
  },

  // Get all teachers
  getAll: async () => {
    return apiRequest('/teacher', {
      method: 'GET',
    });
  },

  // Get current teacher
  getMe: async () => {
    return apiRequest('/teacher/me', {
      method: 'GET',
    });
  },

  // Update teacher profile
  updateProfile: async (profileData) => {
    return apiRequest('/teacher/profile', {
      method: 'PUT',
      body: profileData,
    });
  },

  // Update FCM token
  updateFcmToken: async (fcmToken) => {
    return apiRequest('/teacher/fcm-token', {
      method: 'PUT',
      body: { fcmToken },
    });
  },

  // Get classes (public - for creating live classes)
  getClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    });
  },

  // Get subjects (public - for creating live classes)
  // Supports both regular classes (classNumber + board) and preparation classes (classId)
  getSubjects: async (params = {}) => {
    const { classNumber, board, classId } = params;
    let endpoint = '/student/subjects';
    const queryParams = new URLSearchParams();
    if (classId) {
      queryParams.append('classId', classId);
    } else if (classNumber && board) {
      queryParams.append('class', classNumber);
      queryParams.append('board', board);
    }
    if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

    return apiRequest(endpoint, {
      method: 'GET',
    });
  },

  // Get all classes (for quiz creation - uses public student endpoint)
  getAllClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    });
  },

  // Get all subjects (for quiz creation - uses public student endpoint)
  // Supports filtering by classId, class, and board
  getAllSubjects: async (params = {}) => {
    const { classId, class: classNumber, board } = params;
    let endpoint = '/student/subjects';
    const queryParams = new URLSearchParams();
    if (classId) {
      queryParams.append('classId', classId);
    } else if (classNumber && board) {
      queryParams.append('class', classNumber);
      queryParams.append('board', board);
    }
    if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
};

// Quiz API functions
export const quizAPI = {
  // Get all quizzes
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/teacher/quizzes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get quiz statistics
  getStatistics: async () => {
    return apiRequest('/teacher/quizzes/statistics', {
      method: 'GET',
    });
  },
  // Get single quiz
  getById: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'GET',
    });
  },
  // Create quiz
  create: async (quizData) => {
    return apiRequest('/teacher/quizzes', {
      method: 'POST',
      body: quizData,
    });
  },
  // Update quiz
  update: async (id, quizData) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'PUT',
      body: quizData,
    });
  },
  // Delete quiz
  delete: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'DELETE',
    });
  },
  // Get quiz results (all student submissions)
  getResults: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}/results`, {
      method: 'GET',
    });
  },
};

// About Us API functions
export const aboutAPI = {
  // Get active about us
  getAboutUs: async () => {
    return apiRequest('/about', {
      method: 'GET',
    });
  },
};

// Privacy API functions
export const privacyAPI = {
  // Get active privacy policy
  getPrivacy: async () => {
    return apiRequest('/privacy', {
      method: 'GET',
    });
  },
};

// Terms API functions
export const termsAPI = {
  // Get active terms & conditions
  getTerms: async () => {
    return apiRequest('/terms', {
      method: 'GET',
    });
  },
};

// Doubt API functions
// Timetable API functions
export const timetableAPI = {
  // Get my schedule
  getMySchedule: async (dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/my-schedule${query}`, {
      method: 'GET',
    });
  },
};

// Teacher Attendance API
export const teacherAttendanceAPI = {
  // Mark today's attendance as present
  markToday: async () => {
    return apiRequest('/teacher/attendance/mark', {
      method: 'POST',
    });
  },
  // Get today's attendance status
  getToday: async () => {
    return apiRequest('/teacher/attendance/today', {
      method: 'GET',
    });
  },
  // Get monthly attendance for current teacher
  getMyMonthly: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/teacher/attendance${query}`, {
      method: 'GET',
    });
  },
};

export const doubtAPI = {
  // Get all doubts (for teachers)
  getAllDoubts: async (status = null) => {
    let endpoint = '/doubts';
    if (status) {
      endpoint += `?status=${status}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  // Get single doubt by ID
  getDoubtById: async (id) => {
    return apiRequest(`/doubts/${id}`, {
      method: 'GET',
    });
  },
  // Answer a doubt
  answerDoubt: async (id, answer) => {
    return apiRequest(`/doubts/${id}/answer`, {
      method: 'PUT',
      body: { answer },
    });
  },
  // Update doubt status
  updateDoubtStatus: async (id, status) => {
    return apiRequest(`/doubts/${id}/status`, {
      method: 'PUT',
      body: { status },
    });
  },
};

// Notification API functions
export const notificationAPI = {
  // Get all notifications for current user
  getMyNotifications: async () => {
    return apiRequest('/notifications', {
      method: 'GET',
    });
  },
  // Get unread notification count
  getUnreadCount: async () => {
    return apiRequest('/notifications/unread-count', {
      method: 'GET',
    });
  },
  // Mark notifications as read
  markAsRead: async (notificationIds = []) => {
    return apiRequest('/notifications/mark-read', {
      method: 'PUT',
      body: { notificationIds },
    });
  },
  // Delete notifications
  deleteNotifications: async (notificationIds) => {
    return apiRequest('/notifications', {
      method: 'DELETE',
      body: { notificationIds },
    });
  },
  // Delete all notifications
  deleteAllNotifications: async () => {
    return apiRequest('/notifications/all', {
      method: 'DELETE',
    });
  },
};

// Live Class API functions
export const liveClassAPI = {
  // Get class statistics
  getClassStatistics: async () => {
    return apiRequest('/live-classes/teacher/statistics', {
      method: 'GET',
    });
  },
  // Get my live classes
  getMyLiveClasses: async (date = null, search = null, status = null) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/live-classes/teacher/live-classes${query}`, {
      method: 'GET',
    });
  },
  // Get assigned options (classes/subjects/boards) for live class creation
  getAssignedOptions: async () => {
    return apiRequest('/live-classes/teacher/live-classes/assigned-options', {
      method: 'GET',
    });
  },
  // Create live class
  createLiveClass: async (classId, subjectId, title, description) => {
    return apiRequest('/live-classes/teacher/live-classes', {
      method: 'POST',
      body: { classId, subjectId, title, description },
    });
  },
  // Start live class
  startLiveClass: async (id) => {
    console.log('[API][Teacher] startLiveClass', { id });
    return apiRequest(`/live-classes/teacher/live-classes/${id}/start`, {
      method: 'PUT',
    });
  },
  // End live class
  endLiveClass: async (id) => {
    console.log('[API][Teacher] endLiveClass', { id });
    return apiRequest(`/live-classes/teacher/live-classes/${id}/end`, {
      method: 'PUT',
    });
  },
  // Join live class
  joinLiveClass: async (id) => {
    console.log('[API][Teacher] joinLiveClass', { id });
    return apiRequest(`/live-classes/${id}/join`, {
      method: 'POST',
    });
  },
  // Get live class details
  getLiveClass: async (id) => {
    return apiRequest(`/live-classes/${id}`, {
      method: 'GET',
    });
  },
  // Send chat message
  sendChatMessage: async (id, message) => {
    return apiRequest(`/live-classes/${id}/chat`, {
      method: 'POST',
      body: { message },
    });
  },
  // Mark chat messages as read
  markChatAsRead: async (id) => {
    return apiRequest(`/live-classes/${id}/chat/mark-read`, {
      method: 'PUT',
    });
  },
  // Toggle mute
  toggleMute: async (id) => {
    return apiRequest(`/live-classes/${id}/mute`, {
      method: 'PUT',
    });
  },
  // Toggle video
  toggleVideo: async (id) => {
    return apiRequest(`/live-classes/${id}/video`, {
      method: 'PUT',
    });
  },
  // Upload recording (from client-side MediaRecorder)
  uploadRecording: async (id, file) => {
    const formData = new FormData();
    formData.append('recording', file);

    // For large file uploads, use a longer timeout (30 minutes for 500MB files)
    const fileSizeMB = file.size / (1024 * 1024);
    const timeoutMs = Math.max(600000, fileSizeMB * 60000); // At least 10 minutes, or 1 minute per MB

    console.log('[Teacher API] Uploading recording:', {
      fileSize: file.size,
      fileSizeMB: fileSizeMB.toFixed(2),
      timeoutMs: timeoutMs / 1000 / 60 + ' minutes',
      fileName: file.name
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await apiRequest(`/live-classes/teacher/live-classes/${id}/upload-recording`, {
        method: 'POST',
        body: formData,
        signal: controller.signal, // Add abort signal
      });
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`Upload timeout. The file is too large (${fileSizeMB.toFixed(2)}MB). Please try again or contact support.`);
      }
      throw error;
    }
  },
};

// Agent API functions
export const agentAPI = {
  // Check if agent exists and is active
  checkAgentExists: async (phone) => {
    return apiRequest('/agent/check-exists', {
      method: 'POST',
      body: { phone }
    });
  },
  // Send OTP to agent
  sendOTP: async (phone) => {
    return apiRequest('/agent/send-otp', {
      method: 'POST',
      body: { phone }
    });
  },
  // Verify OTP and login
  verifyOTP: async (phone, otp) => {
    return apiRequest('/agent/verify-otp', {
      method: 'POST',
      body: { phone, otp }
    });
  },
  // Get agent profile
  getMe: async () => {
    return apiRequest('/agent/me', {
      method: 'GET'
    });
  },
  // Update agent profile (limited fields)
  updateMe: async (data) => {
    return apiRequest('/agent/me', {
      method: 'PUT',
      body: data
    });
  },
  // Get referral link
  getReferralLink: async () => {
    return apiRequest('/agent/referral-link', {
      method: 'GET'
    });
  },
  // Get referral statistics
  getStatistics: async () => {
    return apiRequest('/agent/statistics', {
      method: 'GET'
    });
  }
};

export default {
  teacherAPI,
  agentAPI,
  aboutAPI,
  privacyAPI,
  termsAPI,
  doubtAPI,
  quizAPI,
  timetableAPI,
  notificationAPI,
  liveClassAPI,
};

