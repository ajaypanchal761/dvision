// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('[API] Using VITE_API_BASE_URL from env:', cleanUrl);
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
      console.log('[API] Production detected. Hostname:', hostname, '→ API URL:', apiUrl);
      return apiUrl;
    } else {
      console.log('[API] Development mode. Hostname:', hostname);
    }
  }
  
  // Default to localhost for development
  const defaultUrl = 'http://localhost:5000/api';
  console.log('[API] Using default API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('[API] Final API_BASE_URL:', API_BASE_URL);

// Helper function to get auth token (supports both student/teacher and admin tokens)
const getAuthToken = (tokenType = 'student') => {
  if (tokenType === 'admin') {
    return localStorage.getItem('dvision_admin_token');
  }
  return localStorage.getItem('dvision_token');
};

// Helper function to set auth token
const setAuthToken = (token, tokenType = 'student') => {
  if (tokenType === 'admin') {
    localStorage.setItem('dvision_admin_token', token);
  } else {
    localStorage.setItem('dvision_token', token);
  }
};

// Helper function to remove auth token
const removeAuthToken = (tokenType = 'student') => {
  if (tokenType === 'admin') {
    localStorage.removeItem('dvision_admin_token');
  } else {
    localStorage.removeItem('dvision_token');
  }
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}, tokenType = 'student') => {
  const token = getAuthToken(tokenType);
  const isFormData = options.body instanceof FormData;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  
  console.log(`[API] ${method} Request:`, {
    endpoint,
    fullUrl,
    tokenType,
    hasToken: !!token,
    hasBody: !!options.body,
    isFormData
  });

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
    console.log('[API] Request Body:', options.body);
  } else if (options.body) {
    config.body = options.body;
    console.log('[API] Request Body (FormData or other):', options.body instanceof FormData ? 'FormData' : typeof options.body);
  }

  try {
    console.log('[API] Sending request to:', fullUrl);
    const response = await fetch(fullUrl, config);
    console.log('[API] Response received:', {
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
        console.error('[API] Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage
        });
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
        console.error('[API] Error parsing response:', parseError);
        console.error('[API] Error Response (non-JSON):', {
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
      console.log('[API] Success Response:', {
        endpoint,
        success: data.success,
        hasData: !!data.data
      });
      return data;
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.log('[API] Success Response (non-JSON):', {
        endpoint,
        contentType,
        textLength: text.length
      });
      return { success: true, data: text };
    }
  } catch (error) {
    // Handle network errors with detailed logging
    const errorDetails = {
      endpoint,
      fullUrl,
      errorMessage: error.message,
      errorName: error.name,
      errorType: error.constructor.name,
      status: error.status,
      apiBaseUrl: API_BASE_URL,
      currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      currentProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
      timestamp: new Date().toISOString()
    };

    // Check for specific error types
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.error('[API] Network Error - Failed to connect:', errorDetails);
      
      // Provide more specific error message
      let errorMsg = 'Network error. ';
      if (fullUrl.includes('localhost')) {
        errorMsg += 'Backend server is not running on localhost:5000. ';
      } else if (fullUrl.includes('api.dvisionacademy.com')) {
        errorMsg += 'Cannot connect to production API. Please check if https://api.dvisionacademy.com is accessible. ';
      }
      errorMsg += `Trying to connect to: ${fullUrl}`;
      
      throw new Error(errorMsg);
    }
    
    // CORS or other network errors
    if (error.message.includes('CORS') || error.message.includes('blocked')) {
      console.error('[API] CORS Error:', errorDetails);
      throw new Error('CORS error. Please check backend CORS configuration.');
    }
    
    console.error('[API] Request Error:', errorDetails);
    throw error;
  }
};

// ==================== STUDENT API ====================
export const studentAPI = {
  // Check if student exists by phone number
  checkStudentExists: async (phone) => {
    try {
      return await apiRequest(`/student/check-exists?phone=${encodeURIComponent(phone)}`, {
        method: 'GET',
      }, 'student');
    } catch (error) {
      if (error.status === 404) {
        const notFoundError = new Error('Endpoint not found');
        notFoundError.status = 404;
        throw notFoundError;
      }
      throw error;
    }
  },

  // Register student (with all data and send OTP)
  register: async (phone, name, email, studentClass, board, profileImageBase64 = null) => {
    const body = {
      phone,
      name,
      email,
      class: studentClass,
      board,
    };

    if (profileImageBase64) {
      body.profileImageBase64 = profileImageBase64;
    }

    return apiRequest('/student/register', {
      method: 'POST',
      body: body,
    }, 'student');
  },

  // Login student (send OTP)
  login: async (phone) => {
    return apiRequest('/student/login', {
      method: 'POST',
      body: { phone },
    }, 'student');
  },

  // Send OTP
  sendOTP: async (phone) => {
    return apiRequest('/student/send-otp', {
      method: 'POST',
      body: { phone },
    }, 'student');
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    return apiRequest('/student/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    }, 'student');
  },

  // Resend OTP
  resendOTP: async (phone) => {
    return apiRequest('/student/resend-otp', {
      method: 'POST',
      body: { phone },
    }, 'student');
  },

  // Get current student
  getMe: async () => {
    return apiRequest('/student/me', {
      method: 'GET',
    }, 'student');
  },

  // Update profile
  updateProfile: async (profileData) => {
    return apiRequest('/student/profile', {
      method: 'PUT',
      body: profileData,
    }, 'student');
  },

  // Upload profile image
  uploadProfileImage: async (imageFile) => {
    const token = getAuthToken('student');
    const formData = new FormData();
    formData.append('profileImage', imageFile);

    const response = await fetch(`${API_BASE_URL}/student/upload-profile-image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload image');
    }

    return data;
  },

  // Update FCM token
  updateFcmToken: async (fcmToken) => {
    return apiRequest('/student/fcm-token', {
      method: 'PUT',
      body: { fcmToken },
    }, 'student');
  },

  // Get classes (public - for registration)
  getClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    }, 'student');
  },

  // Get courses (filtered by student's class and board)
  getCourses: async () => {
    return apiRequest('/student/courses', {
      method: 'GET',
    }, 'student');
  },

  // Get single course by ID
  getCourseById: async (id) => {
    return apiRequest(`/student/courses/${id}`, {
      method: 'GET',
    }, 'student');
  },

  // Get quizzes (filtered by student's class and board)
  getQuizzes: async () => {
    return apiRequest('/student/quizzes', {
      method: 'GET',
    }, 'student');
  },

  // Get single quiz by ID
  getQuizById: async (id) => {
    return apiRequest(`/student/quizzes/${id}`, {
      method: 'GET',
    }, 'student');
  },

  // Submit quiz
  submitQuiz: async (id, answers) => {
    return apiRequest(`/student/quizzes/${id}/submit`, {
      method: 'POST',
      body: { answers },
    }, 'student');
  },

  // Check submission status
  getSubmissionStatus: async (id) => {
    return apiRequest(`/student/quizzes/${id}/submission-status`, {
      method: 'GET',
    }, 'student');
  },

  // Get quiz leaderboard/results
  getQuizLeaderboard: async (id) => {
    return apiRequest(`/student/quizzes/${id}/leaderboard`, {
      method: 'GET',
    }, 'student');
  },
};

// ==================== TEACHER API ====================
export const teacherAPI = {
  // Check if teacher exists
  checkTeacherExists: async (phone) => {
    return apiRequest(`/teacher/check/${encodeURIComponent(phone)}`, {
      method: 'GET',
    }, 'student');
  },

  // Send OTP
  sendOTP: async (phone) => {
    return apiRequest('/teacher/send-otp', {
      method: 'POST',
      body: { phone },
    }, 'student');
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    return apiRequest('/teacher/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    }, 'student');
  },

  // Resend OTP
  resendOTP: async (phone) => {
    return apiRequest('/teacher/resend-otp', {
      method: 'POST',
      body: { phone },
    }, 'student');
  },

  // Get all teachers (public endpoint)
  getAllTeachers: async () => {
    return apiRequest('/teacher', {
      method: 'GET',
    }, 'student');
  },

  // Get current teacher
  getMe: async () => {
    return apiRequest('/teacher/me', {
      method: 'GET',
    }, 'student');
  },

  // Update teacher profile
  updateProfile: async (profileData) => {
    return apiRequest('/teacher/profile', {
      method: 'PUT',
      body: profileData,
    }, 'student');
  },

  // Update FCM token
  updateFcmToken: async (fcmToken) => {
    return apiRequest('/teacher/fcm-token', {
      method: 'PUT',
      body: { fcmToken },
    }, 'student');
  },

  // Get classes (public - for creating live classes)
  getClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    }, 'student');
  },

  // Get subjects (public - for creating live classes)
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
    }, 'student');
  },

  // Get all classes (for quiz creation)
  getAllClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    }, 'student');
  },

  // Get all subjects (for quiz creation)
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
    }, 'student');
  },
};

// Teacher Quiz API (separate export for teacher module)
export const teacherQuizAPI = {
  // Get all quizzes
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/teacher/quizzes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    }, 'student');
  },
  // Get single quiz
  getById: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'GET',
    }, 'student');
  },
  // Create quiz
  create: async (quizData) => {
    return apiRequest('/teacher/quizzes', {
      method: 'POST',
      body: quizData,
    }, 'student');
  },
  // Update quiz
  update: async (id, quizData) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'PUT',
      body: quizData,
    }, 'student');
  },
  // Delete quiz
  delete: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}`, {
      method: 'DELETE',
    }, 'student');
  },
  // Get quiz results (all student submissions)
  getResults: async (id) => {
    return apiRequest(`/teacher/quizzes/${id}/results`, {
      method: 'GET',
    }, 'student');
  },
};

// Teacher Live Class API (separate export for teacher module)
export const teacherLiveClassAPI = {
  // Get my live classes
  getMyLiveClasses: async (status = null) => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/live-classes/teacher/live-classes${query}`, {
      method: 'GET',
    }, 'student');
  },
  // Get assigned options (classes/subjects/boards) for live class creation
  getAssignedOptions: async () => {
    return apiRequest('/live-classes/teacher/live-classes/assigned-options', {
      method: 'GET',
    }, 'student');
  },
  // Create live class
  createLiveClass: async (classId, subjectId, title, description) => {
    return apiRequest('/live-classes/teacher/live-classes', {
      method: 'POST',
      body: { classId, subjectId, title, description },
    }, 'student');
  },
  // Start live class
  startLiveClass: async (id) => {
    return apiRequest(`/live-classes/teacher/live-classes/${id}/start`, {
      method: 'PUT',
    }, 'student');
  },
  // End live class
  endLiveClass: async (id) => {
    return apiRequest(`/live-classes/teacher/live-classes/${id}/end`, {
      method: 'PUT',
    }, 'student');
  },
  // Join live class
  joinLiveClass: async (id) => {
    return apiRequest(`/live-classes/${id}/join`, {
      method: 'POST',
    }, 'student');
  },
  // Get live class details
  getLiveClass: async (id) => {
    return apiRequest(`/live-classes/${id}`, {
      method: 'GET',
    }, 'student');
  },
  // Send chat message
  sendChatMessage: async (id, message) => {
    return apiRequest(`/live-classes/${id}/chat`, {
      method: 'POST',
      body: { message },
    }, 'student');
  },
  // Toggle mute
  toggleMute: async (id) => {
    return apiRequest(`/live-classes/${id}/mute`, {
      method: 'PUT',
    }, 'student');
  },
  // Toggle video
  toggleVideo: async (id) => {
    return apiRequest(`/live-classes/${id}/video`, {
      method: 'PUT',
    }, 'student');
  },
  // Upload recording
  uploadRecording: async (id, localPath) => {
    return apiRequest(`/live-classes/teacher/live-classes/${id}/upload-recording`, {
      method: 'POST',
      body: { localPath },
    }, 'student');
  },
};

// Alias for compatibility - student uses liveClassAPI, teacher uses teacherLiveClassAPI
// For student module, liveClassAPI should point to studentLiveClassAPI
// For teacher module, liveClassAPI is already aliased to teacherLiveClassAPI above
// We'll export both and let modules import the correct one
export { studentLiveClassAPI as liveClassAPI };

// ==================== ADMIN API ====================
export const adminAPI = {
  // Login
  login: async (email, password) => {
    const response = await apiRequest('/admin/login', {
      method: 'POST',
      body: { email, password },
    }, 'admin');

    // Store token if login successful
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token, 'admin');
    }

    return response;
  },

  // Logout (just remove token from localStorage)
  logout: () => {
    removeAuthToken('admin');
  },

  // Forgot password
  forgotPassword: async (email) => {
    return apiRequest('/admin/forgot-password', {
      method: 'POST',
      body: { email },
    }, 'admin');
  },

  // Reset password
  resetPassword: async (resetToken, password) => {
    return apiRequest(`/admin/reset-password/${resetToken}`, {
      method: 'PUT',
      body: { password },
    }, 'admin');
  },

  // Get current admin
  getMe: async () => {
    return apiRequest('/admin/me', {
      method: 'GET',
    }, 'admin');
  },

  // Update profile
  updateProfile: async (profileData) => {
    return apiRequest('/admin/profile', {
      method: 'PUT',
      body: profileData,
    }, 'admin');
  },

  // Update FCM token
  updateFcmToken: async (fcmToken) => {
    return apiRequest('/admin/fcm-token', {
      method: 'PUT',
      body: { fcmToken },
    }, 'admin');
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiRequest('/admin/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }, 'admin');
  },
};

// Admin Student Management API (separate from student API)
export const adminStudentAPI = {
  // Get all students
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/students${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    }, 'admin');
  },
  // Get single student
  getById: async (id) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create student
  create: async (studentData) => {
    return apiRequest('/admin/students', {
      method: 'POST',
      body: studentData,
    }, 'admin');
  },
  // Update student
  update: async (id, studentData) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'PUT',
      body: studentData,
    }, 'admin');
  },
  // Delete student
  delete: async (id) => {
    return apiRequest(`/admin/students/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Admin Teacher Management API (separate from teacher API)
export const adminTeacherAPI = {
  // Get all teachers
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/teachers${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    }, 'admin');
  },
  // Get single teacher
  getById: async (id) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create teacher
  create: async (teacherData) => {
    return apiRequest('/admin/teachers', {
      method: 'POST',
      body: teacherData,
    }, 'admin');
  },
  // Update teacher
  update: async (id, teacherData) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: teacherData,
    }, 'admin');
  },
  // Delete teacher
  delete: async (id) => {
    return apiRequest(`/admin/teachers/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Admin Quiz Management API
export const quizAPI = {
  // Get all quizzes
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/admin/quizzes${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    }, 'admin');
  },
  // Get single quiz
  getById: async (id) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create quiz
  create: async (quizData) => {
    return apiRequest('/admin/quizzes', {
      method: 'POST',
      body: quizData,
    }, 'admin');
  },
  // Update quiz
  update: async (id, quizData) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: quizData,
    }, 'admin');
  },
  // Delete quiz
  delete: async (id) => {
    return apiRequest(`/admin/quizzes/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
  // Get quiz results
  getResults: async (id) => {
    return apiRequest(`/admin/quizzes/${id}/results`, {
      method: 'GET',
    }, 'admin');
  },
};

// ==================== SHARED APIs ====================

// Doubt API functions
export const doubtAPI = {
  // Create a new doubt (student)
  createDoubt: async (doubtData) => {
    return apiRequest('/student/doubts', {
      method: 'POST',
      body: doubtData,
    }, 'student');
  },
  // Get all doubts for the current student
  getMyDoubts: async () => {
    return apiRequest('/student/doubts', {
      method: 'GET',
    }, 'student');
  },
  // Get all doubts (for teachers and admin)
  getAllDoubts: async (status = null) => {
    let endpoint = '/doubts';
    if (status) {
      endpoint += `?status=${status}`;
    }
    return apiRequest(endpoint, {
      method: 'GET',
    }, 'student');
  },
  // Get single doubt by ID
  getDoubtById: async (id) => {
    return apiRequest(`/doubts/${id}`, {
      method: 'GET',
    }, 'student');
  },
  // Answer a doubt (teacher/admin)
  answerDoubt: async (id, answer) => {
    return apiRequest(`/doubts/${id}/answer`, {
      method: 'PUT',
      body: { answer },
    }, 'student');
  },
  // Update doubt status (teacher/admin)
  updateDoubtStatus: async (id, status) => {
    return apiRequest(`/doubts/${id}/status`, {
      method: 'PUT',
      body: { status },
    }, 'student');
  },
  // Delete a doubt (admin)
  deleteDoubt: async (id) => {
    return apiRequest(`/doubts/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Contact API functions
export const contactAPI = {
  // Get contact info for Contact Us page
  getContactInfo: async () => {
    return apiRequest('/contact', {
      method: 'GET',
    }, 'student');
  },
};

// Terms API functions
export const termsAPI = {
  // Get active terms & conditions
  getTerms: async () => {
    return apiRequest('/terms', {
      method: 'GET',
    }, 'student');
  },
};

// Privacy API functions
export const privacyAPI = {
  // Get active privacy policy
  getPrivacy: async () => {
    return apiRequest('/privacy', {
      method: 'GET',
    }, 'student');
  },
};

// About Us API functions
export const aboutAPI = {
  // Get active about us
  getAboutUs: async () => {
    return apiRequest('/about', {
      method: 'GET',
    }, 'student');
  },
};

// Notification API functions
export const notificationAPI = {
  // Get all notifications for current user
  getMyNotifications: async (tokenType = 'student') => {
    return apiRequest('/notifications', {
      method: 'GET',
    }, tokenType);
  },
  // Get unread notification count
  getUnreadCount: async (tokenType = 'student') => {
    return apiRequest('/notifications/unread-count', {
      method: 'GET',
    }, tokenType);
  },
  // Mark notifications as read
  markAsRead: async (notificationIds = null, tokenType = 'student') => {
    return apiRequest('/notifications/mark-read', {
      method: 'PUT',
      body: notificationIds ? { notificationIds } : {},
    }, tokenType);
  },
  // Delete notifications
  deleteNotifications: async (notificationIds, tokenType = 'student') => {
    return apiRequest('/notifications', {
      method: 'DELETE',
      body: { notificationIds },
    }, tokenType);
  },
  // Delete all notifications
  deleteAllNotifications: async (tokenType = 'student') => {
    return apiRequest('/notifications/all', {
      method: 'DELETE',
    }, tokenType);
  },
  // Admin-specific notification functions
  admin: {
    // Get filtered students
    getFilteredStudents: async (classNumber = null, board = null) => {
      let endpoint = '/notifications/admin/students';
      const params = new URLSearchParams();
      if (classNumber) params.append('class', classNumber);
      if (board) params.append('board', board);
      if (params.toString()) endpoint += `?${params.toString()}`;
      return apiRequest(endpoint, {
        method: 'GET',
      }, 'admin');
    },
    // Get filtered teachers
    getFilteredTeachers: async (classNumber = null) => {
      let endpoint = '/notifications/admin/teachers';
      const params = new URLSearchParams();
      if (classNumber) params.append('class', classNumber);
      if (params.toString()) endpoint += `?${params.toString()}`;
      return apiRequest(endpoint, {
        method: 'GET',
      }, 'admin');
    },
    // Send notification to filtered recipients
    sendNotification: async (data) => {
      return apiRequest('/notifications/admin/send', {
        method: 'POST',
        body: data,
      }, 'admin');
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
      }, 'admin');
    },
    // Campaign management
    getAllCampaigns: async () => {
      return apiRequest('/notifications/admin/campaigns', {
        method: 'GET',
      }, 'admin');
    },
    getCampaign: async (id) => {
      return apiRequest(`/notifications/admin/campaigns/${id}`, {
        method: 'GET',
      }, 'admin');
    },
    createCampaign: async (data) => {
      return apiRequest('/notifications/admin/campaigns', {
        method: 'POST',
        body: data,
      }, 'admin');
    },
    updateCampaign: async (id, data) => {
      return apiRequest(`/notifications/admin/campaigns/${id}`, {
        method: 'PUT',
        body: data,
      }, 'admin');
    },
    deleteCampaign: async (id) => {
      return apiRequest(`/notifications/admin/campaigns/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
    sendCampaign: async (id) => {
      return apiRequest(`/notifications/admin/campaigns/${id}/send`, {
        method: 'POST',
      }, 'admin');
    },
  },
};

// Subscription Plan API functions
export const subscriptionPlanAPI = {
  // Get subscription plans (public - filtered by board and class)
  getPlans: async (board, studentClass) => {
    const params = new URLSearchParams();
    if (board) params.append('board', board);
    if (studentClass) params.append('class', studentClass);

    return apiRequest(`/subscription-plans?${params.toString()}`, {
      method: 'GET',
    }, 'student');
  },
  // Admin functions
  admin: {
    // Get all subscription plans (admin)
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/subscription-plans/admin${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get single subscription plan
    getById: async (id) => {
      return apiRequest(`/subscription-plans/admin/${id}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get classes by board
    getClassesByBoard: async (board) => {
      return apiRequest(`/subscription-plans/admin/classes/${board}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get preparation classes
    getPreparationClasses: async () => {
      return apiRequest('/subscription-plans/admin/preparation-classes', {
        method: 'GET',
      }, 'admin');
    },
    // Create subscription plan
    create: async (planData) => {
      return apiRequest('/subscription-plans/admin', {
        method: 'POST',
        body: planData,
      }, 'admin');
    },
    // Update subscription plan
    update: async (id, planData) => {
      return apiRequest(`/subscription-plans/admin/${id}`, {
        method: 'PUT',
        body: planData,
      }, 'admin');
    },
    // Delete subscription plan
    delete: async (id) => {
      return apiRequest(`/subscription-plans/admin/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
  },
};

// Payment API functions
export const paymentAPI = {
  // Create Cashfree order
  createOrder: async (planId) => {
    return apiRequest('/payment/create-order', {
      method: 'POST',
      body: { planId },
    }, 'student');
  },
  // Verify payment
  verifyPayment: async (orderId, referenceId, paymentSignature, txStatus, orderAmount) => {
    return apiRequest('/payment/verify-payment', {
      method: 'POST',
      body: {
        orderId,
        referenceId,
        paymentSignature,
        txStatus,
        orderAmount
      },
    }, 'student');
  },
  // Get payment history
  getPaymentHistory: async () => {
    return apiRequest('/payment/history', {
      method: 'GET',
    }, 'student');
  },
  // Admin functions
  admin: {
    // Get all payments
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/payment/admin${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get payment statistics
    getStats: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/payment/admin/stats${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 'admin');
    },
  },
};

// Timetable API functions
export const timetableAPI = {
  // Get my class timetable (student)
  getMyClassTimetable: async (dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/my-class${query}`, {
      method: 'GET',
    }, 'student');
  },
  // Get timetable by class ID
  getTimetableByClass: async (classId, dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/class/${classId}${query}`, {
      method: 'GET',
    }, 'student');
  },
  // Get my schedule (teacher)
  getMySchedule: async (dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/my-schedule${query}`, {
      method: 'GET',
    }, 'student');
  },
  // Admin functions
  admin: {
    // Get all timetables
    getAll: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/timetables/admin${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get single timetable
    getById: async (id) => {
      return apiRequest(`/timetables/admin/${id}`, {
        method: 'GET',
      }, 'admin');
    },
    // Create timetable
    create: async (timetableData) => {
      return apiRequest('/timetables/admin', {
        method: 'POST',
        body: timetableData,
      }, 'admin');
    },
    // Create bulk timetables (Weekly Schedule)
    createBulk: async (bulkData) => {
      return apiRequest('/timetables/admin/bulk', {
        method: 'POST',
        body: bulkData,
      }, 'admin');
    },
    // Update timetable
    update: async (id, timetableData) => {
      return apiRequest(`/timetables/admin/${id}`, {
        method: 'PUT',
        body: timetableData,
      }, 'admin');
    },
    // Delete timetable
    delete: async (id) => {
      return apiRequest(`/timetables/admin/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
    // Get subjects by class
    getSubjectsByClass: async (classId) => {
      return apiRequest(`/timetables/admin/subjects/${classId}`, {
        method: 'GET',
      }, 'admin');
    },
    // Get teachers by subject
    getTeachersBySubject: async (subjectId) => {
      return apiRequest(`/timetables/admin/teachers/${subjectId}`, {
        method: 'GET',
      }, 'admin');
    },
  },
};

// Live Class API functions (Student)
export const studentLiveClassAPI = {
  // Get live classes for student's class
  getStudentLiveClasses: async (date = null, search = null) => {
    const params = new URLSearchParams();
    // Always send date parameter (even if it's today's date)
    if (date) {
      params.append('date', date);
    }
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const queryString = params.toString();
    const url = `/live-classes/student/live-classes${queryString ? `?${queryString}` : ''}`;
    console.log('[API] getStudentLiveClasses URL:', url);
    return apiRequest(url, {
      method: 'GET',
    }, 'student');
  },

  // Join live class
  joinLiveClass: async (id) => {
    return apiRequest(`/live-classes/${id}/join`, {
      method: 'POST',
    }, 'student');
  },
  // Get live class details
  getLiveClass: async (id) => {
    return apiRequest(`/live-classes/${id}`, {
      method: 'GET',
    }, 'student');
  },
  // Send chat message
  sendChatMessage: async (id, message) => {
    return apiRequest(`/live-classes/${id}/chat`, {
      method: 'POST',
      body: { message },
    }, 'student');
  },
  // Toggle hand raise
  toggleHandRaise: async (id) => {
    return apiRequest(`/live-classes/${id}/hand-raise`, {
      method: 'PUT',
    }, 'student');
  },
  // Toggle mute
  toggleMute: async (id) => {
    return apiRequest(`/live-classes/${id}/mute`, {
      method: 'PUT',
    }, 'student');
  },
  // Toggle video
  toggleVideo: async (id) => {
    return apiRequest(`/live-classes/${id}/video`, {
      method: 'PUT',
    }, 'student');
  },
  // Get recordings
  getRecordings: async () => {
    return apiRequest('/live-classes/student/recordings', {
      method: 'GET',
    }, 'student');
  },
  // Get recording by ID
  getRecording: async (id) => {
    return apiRequest(`/live-classes/recordings/${id}`, {
      method: 'GET',
    }, 'student');
  },
};

// Banner Management API (Admin)
export const bannerAPI = {
  // Get all banners (public)
  getPublic: async () => {
    return apiRequest('/banners', {
      method: 'GET',
    }, 'student');
  },
  // Get all banners (admin)
  getAll: async () => {
    return apiRequest('/banners/admin', {
      method: 'GET',
    }, 'admin');
  },
  // Get single banner
  getById: async (id) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create banner
  create: async (bannerData) => {
    return apiRequest('/banners/admin', {
      method: 'POST',
      body: bannerData,
    }, 'admin');
  },
  // Update banner
  update: async (id, bannerData) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'PUT',
      body: bannerData,
    }, 'admin');
  },
  // Delete banner
  delete: async (id) => {
    return apiRequest(`/banners/admin/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Content Management API (About Us, Privacy Policy, Terms & Conditions) - Admin
export const contentAPI = {
  // About Us
  aboutUs: {
    get: async () => {
      return apiRequest('/about', {
        method: 'GET',
      }, 'student');
    },
    getAll: async () => {
      return apiRequest('/about/admin', {
        method: 'GET',
      }, 'admin');
    },
    create: async (data) => {
      return apiRequest('/about', {
        method: 'POST',
        body: data,
      }, 'admin');
    },
    update: async (id, data) => {
      return apiRequest(`/about/${id}`, {
        method: 'PUT',
        body: data,
      }, 'admin');
    },
    delete: async (id) => {
      return apiRequest(`/about/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
  },
  // Privacy Policy
  privacy: {
    get: async () => {
      return apiRequest('/privacy', {
        method: 'GET',
      }, 'student');
    },
    getAll: async () => {
      return apiRequest('/privacy/admin', {
        method: 'GET',
      }, 'admin');
    },
    create: async (data) => {
      return apiRequest('/privacy', {
        method: 'POST',
        body: data,
      }, 'admin');
    },
    update: async (id, data) => {
      return apiRequest(`/privacy/${id}`, {
        method: 'PUT',
        body: data,
      }, 'admin');
    },
    delete: async (id) => {
      return apiRequest(`/privacy/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
  },
  // Terms & Conditions
  terms: {
    get: async () => {
      return apiRequest('/terms', {
        method: 'GET',
      }, 'student');
    },
    getAll: async () => {
      return apiRequest('/terms/admin', {
        method: 'GET',
      }, 'admin');
    },
    create: async (data) => {
      return apiRequest('/terms', {
        method: 'POST',
        body: data,
      }, 'admin');
    },
    update: async (id, data) => {
      return apiRequest(`/terms/${id}`, {
        method: 'PUT',
        body: data,
      }, 'admin');
    },
    delete: async (id) => {
      return apiRequest(`/terms/${id}`, {
        method: 'DELETE',
      }, 'admin');
    },
  },
};

// Class Management API (Admin)
export const classAPI = {
  // Get all classes
  getAll: async () => {
    return apiRequest('/admin/classes', {
      method: 'GET',
    }, 'admin');
  },
  // Get single class
  getById: async (id) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create class
  create: async (classData) => {
    return apiRequest('/admin/classes', {
      method: 'POST',
      body: classData,
    }, 'admin');
  },
  // Update class
  update: async (id, classData) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'PUT',
      body: classData,
    }, 'admin');
  },
  // Delete class
  delete: async (id) => {
    return apiRequest(`/admin/classes/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Subject Management API (Admin)
export const subjectAPI = {
  // Get all subjects (optionally filtered by classId, class, board)
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.classId) queryParams.append('classId', params.classId);
    if (params.class) queryParams.append('class', params.class);
    if (params.board) queryParams.append('board', params.board);

    const queryString = queryParams.toString();
    const url = `/admin/subjects${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url, {
      method: 'GET',
    }, 'admin');
  },
  // Get single subject
  getById: async (id) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create subject
  create: async (subjectData) => {
    return apiRequest('/admin/subjects', {
      method: 'POST',
      body: subjectData,
    }, 'admin');
  },
  // Update subject
  update: async (id, subjectData) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'PUT',
      body: subjectData,
    }, 'admin');
  },
  // Delete subject
  delete: async (id) => {
    return apiRequest(`/admin/subjects/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Course Management API (Admin)
export const courseAPI = {
  // Get all courses
  getAll: async () => {
    return apiRequest('/admin/courses', {
      method: 'GET',
    }, 'admin');
  },
  // Get single course
  getById: async (id) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'GET',
    }, 'admin');
  },
  // Create course
  create: async (courseData) => {
    return apiRequest('/admin/courses', {
      method: 'POST',
      body: courseData,
    }, 'admin');
  },
  // Update course
  update: async (id, courseData) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'PUT',
      body: courseData,
    }, 'admin');
  },
  // Delete course
  delete: async (id) => {
    return apiRequest(`/admin/courses/${id}`, {
      method: 'DELETE',
    }, 'admin');
  },
};

// Default export with all APIs
export default {
  studentAPI,
  teacherAPI,
  adminAPI,
  adminStudentAPI,
  adminTeacherAPI,
  teacherQuizAPI,
  teacherLiveClassAPI,
  studentLiveClassAPI,
  doubtAPI,
  contactAPI,
  termsAPI,
  privacyAPI,
  aboutAPI,
  notificationAPI,
  subscriptionPlanAPI,
  paymentAPI,
  timetableAPI,
  liveClassAPI,
  bannerAPI,
  contentAPI,
  classAPI,
  subjectAPI,
  courseAPI,
  quizAPI,
};
