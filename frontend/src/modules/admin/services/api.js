// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('[Admin API] Using VITE_API_BASE_URL from env:', cleanUrl);
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
      console.log('[Admin API] Production detected. Hostname:', hostname, '→ API URL:', apiUrl);
      return apiUrl;
    } else {
      console.log('[Admin API] Development mode. Hostname:', hostname);
    }
  }

  // Default to localhost for development
  const defaultUrl = 'http://localhost:5000/api';
  console.log('[Admin API] Using default API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('[Admin API] Final API_BASE_URL:', API_BASE_URL);

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('dvision_admin_token');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('dvision_admin_token', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('dvision_admin_token');
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

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';

  console.log(`[Admin API] ${method} Request:`, {
    endpoint,
    fullUrl,
    hasToken: !!token,
    hasBody: !!options.body,
    isFormData
  });

  if (options.body && typeof options.body === 'object' && !isFormData) {
    console.log('[Admin API] Request Body:', options.body);
  }

  try {
    console.log('[Admin API] Sending request to:', fullUrl);
    const response = await fetch(fullUrl, config);
    console.log('[Admin API] Response received:', {
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
        console.error('[Admin API] Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage
        });
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
        console.error('[Admin API] Error parsing response:', parseError);
        console.error('[Admin API] Error Response (non-JSON):', {
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
      console.log('[Admin API] Success Response:', {
        endpoint,
        success: data.success,
        hasData: !!data.data
      });
      return data;
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.log('[Admin API] Success Response (non-JSON):', {
        endpoint,
        contentType,
        textLength: text.length
      });
      return { success: true, data: text };
    }
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('[Admin API] Network Error:', {
        endpoint,
        fullUrl,
        error: error.message,
        errorName: error.name,
        stack: error.stack
      });
      throw new Error('Network error. Please check if the server is running.');
    }
    console.error('[Admin API] Request Error:', {
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

// Admin API functions
export const adminAPI = {
  // Get dashboard statistics
  getDashboardStatistics: async () => {
    return apiRequest('/admin/dashboard/statistics', {
      method: 'GET',
    });
  },
  // Login
  login: async (email, password) => {
    const response = await apiRequest('/admin/login', {
      method: 'POST',
      body: { email, password },
    });

    // Store token if login successful
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  // Logout (just remove token from localStorage)
  logout: () => {
    removeAuthToken();
  },

  // Forgot password
  forgotPassword: async (email) => {
    return apiRequest('/admin/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  // Reset password
  resetPassword: async (resetToken, password) => {
    return apiRequest(`/admin/reset-password/${resetToken}`, {
      method: 'PUT',
      body: { password },
    });
  },

  // Get current admin
  getMe: async () => {
    return apiRequest('/admin/me', {
      method: 'GET',
    });
  },

  // Update profile
  updateProfile: async (profileData) => {
    return apiRequest('/admin/profile', {
      method: 'PUT',
      body: profileData,
    });
  },

  // Update FCM token (supports platform: 'web' | 'app')
  updateFcmToken: async (fcmToken, platform = 'web') => {
    return apiRequest('/admin/fcm-token', {
      method: 'PUT',
      body: { fcmToken, platform },
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/admin/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};

// Student Management API
export const studentAPI = {
  // Get student statistics
  getStatistics: async () => {
    return apiRequest('/admin/students/statistics', {
      method: 'GET',
    });
  },
  // Get all students
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/students${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single student
  getById: async (id) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'GET',
    });
  },
  // Create student
  create: async (studentData) => {
    return apiRequest('/admin/students', {
      method: 'POST',
      body: studentData,
    });
  },
  // Update student
  update: async (id, studentData) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'PUT',
      body: studentData,
    });
  },
  // Delete student
  delete: async (id) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'DELETE',
    });
  },
};

// Teacher Management API
export const teacherAPI = {
  // Get teacher statistics
  getStatistics: async () => {
    return apiRequest('/admin/teachers/statistics', {
      method: 'GET',
    });
  },
  // Get all teachers
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/teachers${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single teacher
  getById: async (id) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'GET',
    });
  },
  // Create teacher
  create: async (teacherData) => {
    return apiRequest('/admin/teachers', {
      method: 'POST',
      body: teacherData,
    });
  },
  // Update teacher
  update: async (id, teacherData) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: teacherData,
    });
  },
  // Delete teacher
  delete: async (id) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Banner Management API
export const bannerAPI = {
  // Get all banners (public)
  getPublic: async () => {
    return apiRequest('/banners', {
      method: 'GET',
    });
  },
  // Get all banners (admin)
  getAll: async () => {
    return apiRequest('/banners/admin', {
      method: 'GET',
    });
  },
  // Get single banner
  getById: async (id) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'GET',
    });
  },
  // Create banner
  create: async (bannerData) => {
    return apiRequest('/banners/admin', {
      method: 'POST',
      body: bannerData,
    });
  },
  // Update banner
  update: async (id, bannerData) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'PUT',
      body: bannerData,
    });
  },
  // Delete banner
  delete: async (id) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'DELETE',
    });
  },
};

// Content Management API (About Us, Privacy Policy, Terms & Conditions)
export const contentAPI = {
  // About Us
  aboutUs: {
    get: async () => {
      return apiRequest('/about', {
        method: 'GET',
      });
    },
    getAll: async () => {
      return apiRequest('/about/admin', {
        method: 'GET',
      });
    },
    create: async (data) => {
      return apiRequest('/about', {
        method: 'POST',
        body: data,
      });
    },
    update: async (id, data) => {
      return apiRequest(`/about/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    delete: async (id) => {
      return apiRequest(`/about/${id}`, {
        method: 'DELETE',
      });
    },
  },
  // Privacy Policy
  privacy: {
    get: async () => {
      return apiRequest('/privacy', {
        method: 'GET',
      });
    },
    getAll: async () => {
      return apiRequest('/privacy/admin', {
        method: 'GET',
      });
    },
    create: async (data) => {
      return apiRequest('/privacy', {
        method: 'POST',
        body: data,
      });
    },
    update: async (id, data) => {
      return apiRequest(`/privacy/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    delete: async (id) => {
      return apiRequest(`/privacy/${id}`, {
        method: 'DELETE',
      });
    },
  },
  // Terms & Conditions
  terms: {
    get: async () => {
      return apiRequest('/terms', {
        method: 'GET',
      });
    },
    getAll: async () => {
      return apiRequest('/terms/admin', {
        method: 'GET',
      });
    },
    create: async (data) => {
      return apiRequest('/terms', {
        method: 'POST',
        body: data,
      });
    },
    update: async (id, data) => {
      return apiRequest(`/terms/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    delete: async (id) => {
      return apiRequest(`/terms/${id}`, {
        method: 'DELETE',
      });
    },
  },
};

// Class Management API
export const classAPI = {
  // Get class statistics
  getStatistics: async () => {
    return apiRequest('/admin/classes/statistics', {
      method: 'GET',
    });
  },
  // Get all classes without pagination (for dropdowns and filters)
  getAllWithoutPagination: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/classes/all${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get all classes (with pagination)
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/classes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single class
  getById: async (id) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'GET',
    });
  },
  // Create class
  create: async (classData) => {
    return apiRequest('/admin/classes', {
      method: 'POST',
      body: classData,
    });
  },
  // Update class
  update: async (id, classData) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'PUT',
      body: classData,
    });
  },
  // Delete class
  delete: async (id) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Subject Management API
export const subjectAPI = {
  // Get subject statistics
  getStatistics: async () => {
    return apiRequest('/admin/subjects/statistics', {
      method: 'GET',
    });
  },
  // Get all subjects without pagination (for dropdowns)
  getAllWithoutPagination: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/subjects/all${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get all subjects (optionally filtered by classId, class, board)
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.classId) queryParams.append('classId', params.classId);
    if (params.class) queryParams.append('class', params.class);
    if (params.board) queryParams.append('board', params.board);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/admin/subjects${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url, {
      method: 'GET',
    });
  },
  // Get single subject
  getById: async (id) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'GET',
    });
  },
  // Create subject
  create: async (subjectData) => {
    return apiRequest('/admin/subjects', {
      method: 'POST',
      body: subjectData,
    });
  },
  // Update subject
  update: async (id, subjectData) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'PUT',
      body: subjectData,
    });
  },
  // Delete subject
  delete: async (id) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'DELETE',
    });
  },
};

// Course Management API
export const courseAPI = {
  // Get course statistics
  getStatistics: async () => {
    return apiRequest('/admin/courses/statistics', {
      method: 'GET',
    });
  },
  // Get all courses
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/courses${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single course
  getById: async (id) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'GET',
    });
  },
  // Create course
  create: async (courseData) => {
    return apiRequest('/admin/courses', {
      method: 'POST',
      body: courseData,
    });
  },
  // Update course
  update: async (id, courseData) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'PUT',
      body: courseData,
    });
  },
  // Delete course
  delete: async (id) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'DELETE',
    });
  },
};

// Subscription Plan Management API
export const subscriptionPlanAPI = {
  // Get subscription plan statistics
  getStatistics: async () => {
    return apiRequest('/subscription-plans/admin/statistics', {
      method: 'GET',
    });
  },
  // Get all subscription plans (admin)
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/subscription-plans/admin${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single subscription plan
  getById: async (id) => {
    return apiRequest(`/subscription-plans/admin/${id}`, {
      method: 'GET',
    });
  },
  // Get classes by board
  getClassesByBoard: async (board) => {
    return apiRequest(`/subscription-plans/admin/classes/${board}`, {
      method: 'GET',
    });
  },
  // Get preparation classes
  // all: if true, returns all active preparation classes (for student management)
  //      if false/undefined, returns only classes missing plans (for plan creation)
  getPreparationClasses: async (all = false) => {
    const queryParam = all ? '?all=true' : '';
    return apiRequest(`/subscription-plans/admin/preparation-classes${queryParam}`, {
      method: 'GET',
    });
  },
  // Create subscription plan
  create: async (planData) => {
    return apiRequest('/subscription-plans/admin', {
      method: 'POST',
      body: planData,
    });
  },
  // Update subscription plan
  update: async (id, planData) => {
    return apiRequest(`/subscription-plans/admin/${id}`, {
      method: 'PUT',
      body: planData,
    });
  },
  // Delete subscription plan
  delete: async (id) => {
    return apiRequest(`/subscription-plans/admin/${id}`, {
      method: 'DELETE',
    });
  },
};

// Teacher Attendance API (admin)
export const teacherAttendanceAPI = {
  // Get monthly attendance for a specific teacher
  getMonthlyForTeacher: async (teacherId, year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/admin/teachers/${teacherId}/attendance${query}`, {
      method: 'GET',
    });
  },
  // Get all attendance records (optionally filtered)
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const query = queryString ? `?${queryString}` : '';
    return apiRequest(`/admin/teachers/attendance${query}`, {
      method: 'GET',
    });
  },
};

// Payment Management API (Admin)
export const paymentAPI = {
  // Get all payments
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payment/admin${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get payment statistics
  getStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/payment/admin/stats${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
};

// Doubt Management API
export const doubtAPI = {
  // Get doubt statistics
  getStatistics: async () => {
    return apiRequest('/doubts/statistics', {
      method: 'GET',
    });
  },
  // Get all doubts
  getAllDoubts: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    return apiRequest(`/doubts${queryString ? `?${queryString}` : ''}`, {
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
  // Delete a doubt
  deleteDoubt: async (id) => {
    return apiRequest(`/doubts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Quiz Management API
export const quizAPI = {
  // Get quiz statistics
  getStatistics: async () => {
    return apiRequest('/admin/quizzes/statistics', {
      method: 'GET',
    });
  },
  // Get all quizzes
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/quizzes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single quiz
  getById: async (id) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'GET',
    });
  },
  // Create quiz
  create: async (quizData) => {
    return apiRequest('/admin/quizzes', {
      method: 'POST',
      body: quizData,
    });
  },
  // Update quiz
  update: async (id, quizData) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: quizData,
    });
  },
  // Delete quiz
  delete: async (id) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'DELETE',
    });
  },
  // Get quiz results
  getResults: async (id) => {
    return apiRequest(`/admin/quizzes/${id}/results`, {
      method: 'GET',
    });
  },
};

// Timetable Management API
export const timetableAPI = {
  // Get timetable statistics
  getStatistics: async () => {
    return apiRequest('/timetables/admin/statistics', {
      method: 'GET',
    });
  },
  // Get all timetables
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/timetables/admin${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single timetable
  getById: async (id) => {
    return apiRequest(`/timetables/admin/${id}`, {
      method: 'GET',
    });
  },
  // Create timetable
  create: async (timetableData) => {
    return apiRequest('/timetables/admin', {
      method: 'POST',
      body: timetableData,
    });
  },
  // Create bulk timetables (Weekly Schedule)
  createBulk: async (bulkData) => {
    return apiRequest('/timetables/admin/bulk', {
      method: 'POST',
      body: bulkData,
    });
  },
  // Update timetable
  update: async (id, timetableData) => {
    return apiRequest(`/timetables/admin/${id}`, {
      method: 'PUT',
      body: timetableData,
    });
  },
  // Delete timetable
  delete: async (id) => {
    return apiRequest(`/timetables/admin/${id}`, {
      method: 'DELETE',
    });
  },
  // Get subjects by class
  getSubjectsByClass: async (classId) => {
    return apiRequest(`/timetables/admin/subjects/${classId}`, {
      method: 'GET',
    });
  },
  // Get teachers by subject
  getTeachersBySubject: async (subjectId) => {
    return apiRequest(`/timetables/admin/teachers/${subjectId}`, {
      method: 'GET',
    });
  },
};

// Notification Management API
export const notificationAPI = {
  // Get all notifications for current user (admin)
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
  // Get filtered students
  getFilteredStudents: async (classNumber = null, board = null) => {
    let endpoint = '/notifications/admin/students';
    const params = new URLSearchParams();
    if (classNumber) params.append('class', classNumber);
    if (board) params.append('board', board);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  // Get filtered teachers
  getFilteredTeachers: async (classNumber = null) => {
    let endpoint = '/notifications/admin/teachers';
    const params = new URLSearchParams();
    if (classNumber) params.append('class', classNumber);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  // Send notification to filtered recipients
  sendNotification: async (data) => {
    return apiRequest('/notifications/admin/send', {
      method: 'POST',
      body: data,
    });
  },
  // Get notification history
  getHistory: async (recipientType = null, limit = 50) => {
    let endpoint = '/notifications/admin/history';
    const params = new URLSearchParams();
    if (recipientType) params.append('recipientType', recipientType);
    if (limit) params.append('limit', limit);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return apiRequest(endpoint, {
      method: 'GET',
    });
  },
  // Campaign management
  getAllCampaigns: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/notifications/admin/campaigns${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url, {
      method: 'GET',
    });
  },
  getCampaign: async (id) => {
    return apiRequest(`/notifications/admin/campaigns/${id}`, {
      method: 'GET',
    });
  },
  createCampaign: async (data) => {
    return apiRequest('/notifications/admin/campaigns', {
      method: 'POST',
      body: data,
    });
  },
  updateCampaign: async (id, data) => {
    return apiRequest(`/notifications/admin/campaigns/${id}`, {
      method: 'PUT',
      body: data,
    });
  },
  deleteCampaign: async (id) => {
    return apiRequest(`/notifications/admin/campaigns/${id}`, {
      method: 'DELETE',
    });
  },
  sendCampaign: async (id) => {
    return apiRequest(`/notifications/admin/campaigns/${id}/send`, {
      method: 'POST',
    });
  },
};

// Agent Management API
export const agentAPI = {
  // Get agent statistics
  getStatistics: async () => {
    return apiRequest('/admin/agents/statistics', {
      method: 'GET',
    });
  },
  // Create agent
  create: async (agentData) => {
    return apiRequest('/admin/agents', {
      method: 'POST',
      body: agentData,
    });
  },
  // Get all agents
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/agents${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single agent
  getById: async (id) => {
    return apiRequest(`/admin/agents/${id}`, {
      method: 'GET',
    });
  },
  // Update agent
  update: async (id, agentData) => {
    return apiRequest(`/admin/agents/${id}`, {
      method: 'PUT',
      body: agentData,
    });
  },
  // Delete/deactivate agent
  delete: async (id) => {
    return apiRequest(`/admin/agents/${id}`, {
      method: 'DELETE',
    });
  },
  // Get agent referrals
  getReferrals: async (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/agents/${id}/referrals${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
};

// Referral Management API
export const referralAPI = {
  // Get all referrals
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/referrals${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Update referral status
  updateStatus: async (id, status) => {
    return apiRequest(`/admin/referrals/${id}/status`, {
      method: 'PUT',
      body: { status },
    });
  },
  // Get referral statistics
  getStatistics: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/referrals/statistics${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
};

// Admin Live Classes (Teacher Classes) API
export const liveClassAdminAPI = {
  // Get live class statistics
  getStatistics: async () => {
    return apiRequest('/admin/live-classes/statistics', {
      method: 'GET',
    });
  },
  // Get all live classes with optional filters
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/live-classes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  // Get single live class with participants
  getById: async (id) => {
    return apiRequest(`/admin/live-classes/${id}`, {
      method: 'GET',
    });
  },
};

// Admin Recording API
export const recordingAdminAPI = {
  // Get recording statistics
  getStatistics: async () => {
    return apiRequest('/admin/recordings/statistics', {
      method: 'GET',
    });
  },
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/recordings${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },
  getById: async (id) => {
    return apiRequest(`/admin/recordings/${id}`, {
      method: 'GET',
    });
  },
};

export default { adminAPI, studentAPI, teacherAPI, bannerAPI, contentAPI, classAPI, subjectAPI, courseAPI, subscriptionPlanAPI, paymentAPI, doubtAPI, quizAPI, timetableAPI, notificationAPI, agentAPI, referralAPI, liveClassAdminAPI, recordingAdminAPI };