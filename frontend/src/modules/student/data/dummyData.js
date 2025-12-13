/**
 * Dummy Data for D'Vision Academy Student App
 * Contains courses, users, tests, doubts, notifications, etc.
 */

// Import course images from assets
import sub1 from '../assets/sub1.jpg';
import sub2 from '../assets/sub2.jpg';
import sub3 from '../assets/sub3.jpg';
import sub4 from '../assets/sub4.jpg';
import sub5 from '../assets/sub5.jpg';

// Courses data - Classes 6th to 12th with CBSE and RBSE boards
export const courses = [
  // Class 6th Courses
  {
    id: 1,
    name: 'Class 6 CBSE Complete Course',
    class: '6th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete course for Class 6 CBSE students covering all major subjects with interactive learning.',
    thumbnail: sub1,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Rajesh Kumar', subject: 'Mathematics', experience: '10 years' },
      { name: 'Priya Sharma', subject: 'Science', experience: '8 years' },
      { name: 'Amit Verma', subject: 'English', experience: '12 years' }
    ],
    features: {
      weeklyLiveClasses: 5,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 2999, validity: '3 months' },
      '6months': { price: 4999, validity: '6 months' },
      '12months': { price: 8999, validity: '12 months' }
    }
  },
  {
    id: 2,
    name: 'Class 6 RBSE Complete Course',
    class: '6th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete course for Class 6 RBSE students with Rajasthan Board curriculum.',
    thumbnail: sub2,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Suresh Meena', subject: 'Mathematics', experience: '9 years' },
      { name: 'Kavita Yadav', subject: 'Science', experience: '7 years' },
      { name: 'Manoj Singh', subject: 'English', experience: '11 years' }
    ],
    features: {
      weeklyLiveClasses: 5,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 2999, validity: '3 months' },
      '6months': { price: 4999, validity: '6 months' },
      '12months': { price: 8999, validity: '12 months' }
    }
  },

  // Class 7th Courses
  {
    id: 3,
    name: 'Class 7 CBSE Complete Course',
    class: '7th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Comprehensive course for Class 7 CBSE covering all subjects with detailed explanations.',
    thumbnail: sub3,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Vikram Patel', subject: 'Mathematics', experience: '11 years' },
      { name: 'Anjali Desai', subject: 'Science', experience: '9 years' },
      { name: 'Rahul Gupta', subject: 'English', experience: '13 years' }
    ],
    features: {
      weeklyLiveClasses: 6,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 3499, validity: '3 months' },
      '6months': { price: 5999, validity: '6 months' },
      '12months': { price: 9999, validity: '12 months' }
    }
  },
  {
    id: 4,
    name: 'Class 7 RBSE Complete Course',
    class: '7th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete RBSE course for Class 7 students with board-specific curriculum.',
    thumbnail: sub4,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Deepak Sharma', subject: 'Mathematics', experience: '10 years' },
      { name: 'Sunita Kumari', subject: 'Science', experience: '8 years' },
      { name: 'Naresh Meena', subject: 'English', experience: '12 years' }
    ],
    features: {
      weeklyLiveClasses: 6,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 3499, validity: '3 months' },
      '6months': { price: 5999, validity: '6 months' },
      '12months': { price: 9999, validity: '12 months' }
    }
  },

  // Class 8th Courses
  {
    id: 5,
    name: 'Class 8 CBSE Complete Course',
    class: '8th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Advanced course for Class 8 CBSE students preparing for higher classes.',
    thumbnail: sub5,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Sanjay Kumar', subject: 'Mathematics', experience: '12 years' },
      { name: 'Meera Joshi', subject: 'Science', experience: '10 years' },
      { name: 'Arjun Malhotra', subject: 'English', experience: '14 years' }
    ],
    features: {
      weeklyLiveClasses: 6,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 3999, validity: '3 months' },
      '6months': { price: 6999, validity: '6 months' },
      '12months': { price: 11999, validity: '12 months' }
    }
  },
  {
    id: 6,
    name: 'Class 8 RBSE Complete Course',
    class: '8th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete RBSE course for Class 8 with comprehensive study material.',
    thumbnail: sub1,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Ramesh Yadav', subject: 'Mathematics', experience: '11 years' },
      { name: 'Pooja Sharma', subject: 'Science', experience: '9 years' },
      { name: 'Vikash Meena', subject: 'English', experience: '13 years' }
    ],
    features: {
      weeklyLiveClasses: 6,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 3999, validity: '3 months' },
      '6months': { price: 6999, validity: '6 months' },
      '12months': { price: 11999, validity: '12 months' }
    }
  },

  // Class 9th Courses
  {
    id: 7,
    name: 'Class 9 CBSE Complete Course',
    class: '9th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Foundation course for Class 9 CBSE students preparing for board exams.',
    thumbnail: sub2,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Amitabh Singh', subject: 'Mathematics', experience: '15 years' },
      { name: 'Rekha Verma', subject: 'Science', experience: '12 years' },
      { name: 'Kiran Desai', subject: 'English', experience: '16 years' }
    ],
    features: {
      weeklyLiveClasses: 7,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 4499, validity: '3 months' },
      '6months': { price: 7999, validity: '6 months' },
      '12months': { price: 13999, validity: '12 months' }
    }
  },
  {
    id: 8,
    name: 'Class 9 RBSE Complete Course',
    class: '9th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete RBSE course for Class 9 with board exam preparation.',
    thumbnail: sub3,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Mahesh Kumar', subject: 'Mathematics', experience: '14 years' },
      { name: 'Sneha Yadav', subject: 'Science', experience: '11 years' },
      { name: 'Rohit Meena', subject: 'English', experience: '15 years' }
    ],
    features: {
      weeklyLiveClasses: 7,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 4499, validity: '3 months' },
      '6months': { price: 7999, validity: '6 months' },
      '12months': { price: 13999, validity: '12 months' }
    }
  },

  // Class 10th Courses
  {
    id: 9,
    name: 'Class 10 CBSE Complete Course',
    class: '10th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Comprehensive Class 10 CBSE course with board exam preparation and practice tests.',
    thumbnail: sub4,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Ravi Shankar', subject: 'Mathematics', experience: '18 years' },
      { name: 'Dr. Anjali Kapoor', subject: 'Science', experience: '16 years' },
      { name: 'Prof. Sameer Khan', subject: 'English', experience: '20 years' }
    ],
    features: {
      weeklyLiveClasses: 8,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 4999, validity: '3 months' },
      '6months': { price: 8999, validity: '6 months' },
      '12months': { price: 15999, validity: '12 months' }
    }
  },
  {
    id: 10,
    name: 'Class 10 RBSE Complete Course',
    class: '10th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
    description: 'Complete RBSE Class 10 course with board-specific syllabus and exam preparation.',
    thumbnail: sub5,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Pradeep Meena', subject: 'Mathematics', experience: '17 years' },
      { name: 'Dr. Kavita Sharma', subject: 'Science', experience: '15 years' },
      { name: 'Prof. Rajesh Yadav', subject: 'English', experience: '19 years' }
    ],
    features: {
      weeklyLiveClasses: 8,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 4999, validity: '3 months' },
      '6months': { price: 8999, validity: '6 months' },
      '12months': { price: 15999, validity: '12 months' }
    }
  },

  // Class 11th Courses
  {
    id: 11,
    name: 'Class 11 CBSE Science Stream',
    class: '11th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    description: 'Class 11 CBSE Science stream course with detailed subject coverage.',
    thumbnail: sub1,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Ashok Kumar', subject: 'Physics', experience: '20 years' },
      { name: 'Dr. Neha Singh', subject: 'Chemistry', experience: '18 years' },
      { name: 'Dr. Manoj Verma', subject: 'Biology', experience: '19 years' }
    ],
    features: {
      weeklyLiveClasses: 10,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 5999, validity: '3 months' },
      '6months': { price: 10999, validity: '6 months' },
      '12months': { price: 19999, validity: '12 months' }
    }
  },
  {
    id: 12,
    name: 'Class 11 RBSE Science Stream',
    class: '11th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    description: 'Class 11 RBSE Science stream with comprehensive study material.',
    thumbnail: sub2,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Suresh Meena', subject: 'Physics', experience: '19 years' },
      { name: 'Dr. Priya Yadav', subject: 'Chemistry', experience: '17 years' },
      { name: 'Dr. Ajay Sharma', subject: 'Biology', experience: '18 years' }
    ],
    features: {
      weeklyLiveClasses: 10,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 5999, validity: '3 months' },
      '6months': { price: 10999, validity: '6 months' },
      '12months': { price: 19999, validity: '12 months' }
    }
  },

  // Class 12th Courses
  {
    id: 13,
    name: 'Class 12 CBSE Science Stream',
    class: '12th',
    board: 'CBSE',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    description: 'Complete Class 12 CBSE Science stream course with board exam preparation.',
    thumbnail: sub3,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Vikram Malhotra', subject: 'Physics', experience: '22 years' },
      { name: 'Dr. Anjali Desai', subject: 'Chemistry', experience: '20 years' },
      { name: 'Dr. Rajesh Patel', subject: 'Biology', experience: '21 years' }
    ],
    features: {
      weeklyLiveClasses: 12,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 6999, validity: '3 months' },
      '6months': { price: 12999, validity: '6 months' },
      '12months': { price: 22999, validity: '12 months' }
    }
  },
  {
    id: 14,
    name: 'Class 12 RBSE Science Stream',
    class: '12th',
    board: 'RBSE',
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    description: 'Complete Class 12 RBSE Science stream with board exam focus.',
    thumbnail: sub4,
    previewVideo: 'https://via.placeholder.com/300x200?text=Preview+Video',
    teachers: [
      { name: 'Dr. Mahesh Yadav', subject: 'Physics', experience: '21 years' },
      { name: 'Dr. Sunita Meena', subject: 'Chemistry', experience: '19 years' },
      { name: 'Dr. Naresh Kumar', subject: 'Biology', experience: '20 years' }
    ],
    features: {
      weeklyLiveClasses: 12,
      recordedLectures: true,
      testSeries: true
    },
    plans: {
      '3months': { price: 6999, validity: '3 months' },
      '6months': { price: 12999, validity: '6 months' },
      '12months': { price: 22999, validity: '12 months' }
    }
  }
];

// Users data (for login/registration)
export const users = [
  {
    id: 1,
    fullName: 'Test Student',
    mobileNumber: '9876543210',
    email: 'test@example.com',
    class: '10th',
    board: 'CBSE',
    password: 'password123',
    profilePhoto: null
  }
];

// Subscriptions data
export const subscriptions = [];

// Tests data
export const tests = [];

// Doubts data
export const doubts = [];

// Notifications data
export const notifications = [];

// Live Classes data
export const liveClasses = [];

// Recorded Lectures data
export const recordedLectures = [];

// Study Materials data
export const studyMaterials = [];

/**
 * Helper to normalize class value (supports numeric from backend & '6th' style from dummy data)
 */
const normalizeClassValue = (studentClass) => {
  if (!studentClass) return null;

  // If already a string like '6th', '7th', etc.
  if (typeof studentClass === 'string') {
    return studentClass;
  }

  // If number (from backend: 6,7,8...) convert to ordinal string used in dummy data
  const suffixMap = {
    1: 'st',
    2: 'nd',
    3: 'rd'
  };

  const n = Number(studentClass);
  if (Number.isNaN(n)) return null;

  const lastTwo = n % 100;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? 'th'
      : suffixMap[n % 10] || 'th';

  return `${n}${suffix}`;
};

/**
 * Helper function to get courses by class and board
 */
export const getCoursesByClassAndBoard = (studentClass, board) => {
  const normalizedClass = normalizeClassValue(studentClass);
  if (!normalizedClass) return [];

  return courses.filter(
    course => course.class === normalizedClass && course.board === board
  );
};

/**
 * Helper function to get all courses for a class
 */
export const getCoursesByClass = (studentClass) => {
  const normalizedClass = normalizeClassValue(studentClass);
  if (!normalizedClass) return [];

  return courses.filter(course => course.class === normalizedClass);
};

/**
 * Helper function to get course by ID
 */
export const getCourseById = (courseId) => {
  return courses.find(course => course.id === parseInt(courseId));
};

