// Auto-detect API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[API] Using VITE_API_BASE_URL from env:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
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

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('dvision_token');
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  
  console.log(`[API] ${method} Request:`, {
    endpoint,
    fullUrl,
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

// Student API functions
export const studentAPI = {
  // Check if student exists by phone number
  checkStudentExists: async (phone) => {
    try {
      return await apiRequest(`/student/check-exists?phone=${encodeURIComponent(phone)}`, {
        method: 'GET',
      });
    } catch (error) {
      // If endpoint doesn't exist (404), return error with status
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
    });
  },

  // Login student (send OTP)
  login: async (phone) => {
    return apiRequest('/student/login', {
      method: 'POST',
      body: { phone },
    });
  },

  // Send OTP
  sendOTP: async (phone) => {
    return apiRequest('/student/send-otp', {
      method: 'POST',
      body: { phone },
    });
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    return apiRequest('/student/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    });
  },

  // Resend OTP
  resendOTP: async (phone) => {
    return apiRequest('/student/resend-otp', {
      method: 'POST',
      body: { phone },
    });
  },

  // Get current student
  getMe: async () => {
    return apiRequest('/student/me', {
      method: 'GET',
    });
  },

  // Update profile
  updateProfile: async (profileData) => {
    return apiRequest('/student/profile', {
      method: 'PUT',
      body: profileData,
    });
  },

  // Upload profile image
  uploadProfileImage: async (imageFile) => {
    const token = getAuthToken();
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
    });
  },

  // Get classes (public - for registration)
  getClasses: async () => {
    return apiRequest('/student/classes', {
      method: 'GET',
    });
  },

  // Get courses (filtered by student's class and board)
  getCourses: async () => {
    return apiRequest('/student/courses', {
      method: 'GET',
    });
  },

  // Get single course by ID
  getCourseById: async (id) => {
    return apiRequest(`/student/courses/${id}`, {
      method: 'GET',
    });
  },

  // Get quizzes (filtered by student's class and board)
  getQuizzes: async () => {
    return apiRequest('/student/quizzes', {
      method: 'GET',
    });
  },

  // Get single quiz by ID
  getQuizById: async (id) => {
    return apiRequest(`/student/quizzes/${id}`, {
      method: 'GET',
    });
  },

  // Submit quiz
  submitQuiz: async (id, answers) => {
    return apiRequest(`/student/quizzes/${id}/submit`, {
      method: 'POST',
      body: { answers },
    });
  },

  // Check submission status
  getSubmissionStatus: async (id) => {
    return apiRequest(`/student/quizzes/${id}/submission-status`, {
      method: 'GET',
    });
  },

  // Get quiz leaderboard/results
  getQuizLeaderboard: async (id) => {
    return apiRequest(`/student/quizzes/${id}/leaderboard`, {
      method: 'GET',
    });
  },
};

// Doubt API functions
export const doubtAPI = {
  // Create a new doubt
  createDoubt: async (doubtData) => {
    return apiRequest('/student/doubts', {
      method: 'POST',
      body: doubtData,
    });
  },
  // Get all doubts for the current student
  getMyDoubts: async () => {
    return apiRequest('/student/doubts', {
      method: 'GET',
    });
  },
};

// Contact API functions
export const contactAPI = {
  // Get contact info for Contact Us page
  getContactInfo: async () => {
    return apiRequest('/contact', {
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

// Privacy API functions
export const privacyAPI = {
  // Get active privacy policy
  getPrivacy: async () => {
    return apiRequest('/privacy', {
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
  markAsRead: async (notificationIds = null) => {
    return apiRequest('/notifications/mark-read', {
      method: 'PUT',
      body: notificationIds ? { notificationIds } : {},
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

// Subscription Plan API functions
export const subscriptionPlanAPI = {
  // Get subscription plans (public - filtered by board and class)
  getPlans: async (board, studentClass) => {
    const params = new URLSearchParams();
    if (board) params.append('board', board);
    if (studentClass) params.append('class', studentClass);

    return apiRequest(`/subscription-plans?${params.toString()}`, {
      method: 'GET',
    });
  },
};

// Payment API functions
// Timetable API functions
export const timetableAPI = {
  // Get my class timetable
  getMyClassTimetable: async (dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/my-class${query}`, {
      method: 'GET',
    });
  },
  // Get timetable by class ID
  getTimetableByClass: async (classId, dayOfWeek = null) => {
    const query = dayOfWeek ? `?dayOfWeek=${dayOfWeek}` : '';
    return apiRequest(`/timetables/class/${classId}${query}`, {
      method: 'GET',
    });
  },
};

export const paymentAPI = {
  // Create Razorpay order
  createOrder: async (planId) => {
    return apiRequest('/payment/create-order', {
      method: 'POST',
      body: { planId },
    });
  },
  // Verify payment
  verifyPayment: async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    return apiRequest('/payment/verify-payment', {
      method: 'POST',
      body: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      },
    });
  },
  // Get payment history
  getPaymentHistory: async () => {
    return apiRequest('/payment/history', {
      method: 'GET',
    });
  },
};

// Teacher API functions
export const teacherAPI = {
  // Get all teachers (public endpoint)
  getAllTeachers: async () => {
    return apiRequest('/teacher', {
      method: 'GET',
    });
  },
};

// Live Class API functions
export const liveClassAPI = {
  // Get live classes for student's class
  getStudentLiveClasses: async () => {
    return apiRequest('/live-classes/student/live-classes', {
      method: 'GET',
    });
  },
  
  // Join live class
  joinLiveClass: async (id) => {
    console.log('[API][Student] joinLiveClass', { id });
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
  // Toggle hand raise
  toggleHandRaise: async (id) => {
    return apiRequest(`/live-classes/${id}/hand-raise`, {
      method: 'PUT',
    });
  },
  // Toggle mute
  toggleMute: async (id) => {
    console.log('[API][Student] toggleMute', { id });
    return apiRequest(`/live-classes/${id}/mute`, {
      method: 'PUT',
    });
  },
  // Toggle video
  toggleVideo: async (id) => {
    console.log('[API][Student] toggleVideo', { id });
    return apiRequest(`/live-classes/${id}/video`, {
      method: 'PUT',
    });
  },
  // Get recordings
  getRecordings: async () => {
    console.log('[API][Student] getRecordings');
    return apiRequest('/live-classes/student/recordings', {
      method: 'GET',
    });
  },
  // Get recording by ID
  getRecording: async (id) => {
    console.log('[API][Student] getRecording', { id });
    return apiRequest(`/live-classes/recordings/${id}`, {
      method: 'GET',
    });
  },
};


export default {
  studentAPI,
  contactAPI,
  termsAPI,
  privacyAPI,
  aboutAPI,
  notificationAPI,
  subscriptionPlanAPI,
  paymentAPI,
  doubtAPI,
  timetableAPI,
  teacherAPI,
  liveClassAPI,
};
