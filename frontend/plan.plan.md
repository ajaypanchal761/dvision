<!-- 6050fe34-c97d-4520-9f46-a07ea04ed9c8 db56c289-8da1-4e24-a3fe-9cf562486007 -->
# Complete Student App Flow - Tailwind CSS & Dummy Data

## Phase 1: Project Setup & Tailwind CSS

### 1.1 Install Dependencies

- React Router DOM (routing)
- React Hook Form (form handling)
- React Icons (icons)
- date-fns (date utilities)
- Custom video player (react-player or HTML5 video with custom controls)



### 1.3 Project Structure

```
src/
├── components/
│   ├── common/ (Button, Input, Card, Modal, VideoPlayer)
│   ├── onboarding/ (Intro slides)
│   ├── auth/ (OTP input component)
│   ├── course/ (Course cards)
│   ├── test/ (Test components)
│   └── layout/ (Header, Footer)
├── pages/
│   ├── Onboarding.jsx
│   ├── Login.jsx (SEPARATE LOGIN PAGE)
│   ├── MobileOTP.jsx (SEPARATE OTP PAGE)
│   ├── RegistrationForm.jsx (SEPARATE REGISTRATION FORM)
│   ├── FinalOTP.jsx (SEPARATE FINAL OTP PAGE)
│   ├── Dashboard.jsx
│   ├── CourseDetails.jsx
│   ├── CourseContent.jsx
│   ├── TestList.jsx
│   ├── TestAttempt.jsx
│   ├── TestResult.jsx
│   ├── Doubts.jsx
│   ├── Notifications.jsx
│   └── Profile.jsx
├── data/
│   ├── dummyData.js (ALL DUMMY DATA)
│   └── mockAPI.js (MOCK API FUNCTIONS)
├── context/
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useLocalStorage.js
│   └── useTimer.js
├── utils/
│   ├── constants.js
│   ├── helpers.js
│   └── validators.js
└── constants/
    └── routes.js
```

## Phase 2: Authentication Flow (Separate Pages)

### 2.1 Onboarding Page (Onboarding.jsx)

- 3 slides carousel with Tailwind styling
- Slide 1: "Live Classes by Expert Teachers"
- Slide 2: "Quizzes, Tests & Doubts Solving"
- Slide 3: "3/6/12 Month Subscriptions"
- Navigation dots
- "Get Started" button → Navigate to Login
- Store completion in localStorage

### 2.2 Login Page (Login.jsx) - SEPARATE PAGE

- Mobile number input field
- Password input field
- "Login" button
- "New User? Register" link → Navigate to MobileOTP
- Dummy authentication (check against dummyData.js)
- On success → Store user in context → Navigate to Dashboard
- Tailwind CSS styling

### 2.3 Mobile OTP Page (MobileOTP.jsx) - SEPARATE PAGE

- Mobile number input (if not passed from previous step)
- "Send OTP" button
- 6-digit OTP input fields (separate inputs)
- "Verify OTP" button
- Dummy OTP verification (accept any 6-digit code: 123456)
- On verify → Store mobile in context → Navigate to RegistrationForm
- Tailwind CSS styling

### 2.4 Registration Form Page (RegistrationForm.jsx) - SEPARATE PAGE

- Full Name input
- Phone Number (auto-filled from OTP step, read-only)
- Email input
- Class dropdown (6th, 7th, 8th, 9th, 10th, 11th, 12th)
- Board dropdown (CBSE, RBSE, ICSE)
- Password input
- Confirm Password input
- Profile Photo Upload (file input with image preview)
- Form validation with React Hook Form
- "Continue" button → Navigate to FinalOTP
- Tailwind CSS styling

### 2.5 Final OTP Page (FinalOTP.jsx) - SEPARATE PAGE

- 6-digit OTP input fields
- "Verify & Complete Registration" button
- Dummy OTP verification (accept any 6-digit code)
- On success → Save user to dummyData.js (localStorage) → Navigate to Dashboard
- Tailwind CSS styling

## Phase 3: Core Pages

### 3.1 Student Dashboard (Dashboard.jsx)

- Header with profile icon and notifications bell
- "Trending Courses" section
- Auto-filter courses by student's class & board (from dummyData)
- Course cards with:
  - Thumbnail image
  - Course Name
  - Class & Board badges
  - Subjects covered
  - Validity (3/6/12 months)
  - Preview video thumbnail
- Click card → Navigate to CourseDetails
- Tailwind CSS styling

### 3.2 Course Details Page (CourseDetails.jsx)

- Course hero section (title, class, board)
- Subjects included list
- Teachers details section (name, subject, experience)
- Features section:
  - Weekly Live Class Count
  - Recorded Lectures included (Yes/No)
  - Test Series included (Yes/No)
- Demo Video Player (custom video player component)
- Full description
- Subscription Plans section:
  - 3 Months plan with price
  - 6 Months plan with price
  - 12 Months plan with price
- "Subscribe Now" button → Mock Payment Flow
- Tailwind CSS styling

### 3.3 Mock Payment Flow

- "Subscribe Now" click → Show loading state (2-3 seconds)
- Simulate payment processing
- Show success message/toast: "Payment Successful! Course Unlocked"
- Update dummyData (add subscription to user)
- Store in localStorage
- Unlock course access
- Navigate to CourseContent page
- NO ACTUAL PAYMENT GATEWAY

## Phase 4: Course Content Modules

### 4.1 Course Content Layout (CourseContent.jsx)

- Tab navigation: Live Classes | Recorded | Study Material | Tests
- Shared header with course name
- Tailwind CSS tabs

### 4.2 Live Classes Module

- Upcoming live classes list (from dummyData)
- Daily schedule view
- Calendar view (optional)
- Join button → Show mock live class (placeholder)
- Class reminders
- Tailwind CSS styling

### 4.3 Recorded Lectures Module

- Subject-wise organization
- Chapter-wise filtering
- Custom Video Player Component with:
  - Play/Pause button
  - Volume control
  - Fullscreen toggle
  - Progress bar with seek functionality
  - Current time / Total time display
  - Playback speed control (0.5x, 1x, 1.25x, 1.5x, 2x)
  - Quality selection dropdown (if multiple sources)
  - Continue watching feature (save progress in localStorage)
- Progress tracking per video
- Tailwind CSS styling for player controls

### 4.4 Study Material Module

- PDF list (from dummyData)
- Notes section
- Assignments list
- Download button (mock download)
- Tailwind CSS styling

### 4.5 Tests & Quiz Section

**Test List Page (TestList.jsx):**

- Fetch tests from dummyData.js
- Filter by: Chapter, Weekly, Monthly, Full Syllabus
- Test cards showing:
  - Title
  - Subject
  - Total Questions
  - Duration
  - Attempt Status (Not Attempted/Attempted/In Progress)
  - "Start Test" button
- Tailwind CSS styling

**Test Start Page:**

- Test instructions
- Duration, Total questions
- Negative marking info
- "Start Test" button → Navigate to TestAttempt

**Test Attempt UI (TestAttempt.jsx):**

- Question display with 4 options
- Next/Previous navigation buttons
- Question Palette with color coding:
  - Green = Attempted
  - Red = Not Attempted
  - Purple = Marked for review
- Timer (countdown) - use useTimer hook
- Mark for review checkbox
- Submit Test button (with confirmation modal)
- Tailwind CSS styling

**Test Result Page (TestResult.jsx):**

- Total Marks
- Correct / Wrong / Unattempted count
- Accuracy percentage
- Time taken
- Percentile & Rank (if available in dummyData)
- Review Answers section:
  - Student's answer vs Correct answer
  - Explanation (from dummyData)
  - Color coding (green for correct, red for wrong)
- Tailwind CSS styling

## Phase 5: Additional Features

### 5.1 Doubts Section (Doubts.jsx)

- Form: Subject dropdown, Question textarea, Image upload
- Submit doubt → Save to dummyData.js
- Doubts list (pending/answered)
- Teacher reply display
- Notification on reply
- Tailwind CSS styling

### 5.2 Notifications Page (Notifications.jsx)

- List of notifications from dummyData:
  - Live class reminders
  - New PDF uploaded
  - New test uploaded
  - Test result available
  - Doubt reply received
  - Course updates
- Mark as read functionality
- Notification badge in header
- Tailwind CSS styling

### 5.3 Student Profile Page (Profile.jsx)

- Profile display (photo, name, class, board, contact)
- Sections:
  - My Subscriptions (active courses from dummyData)
  - Payment History (mock payment history)
  - Edit Profile (update form)
  - Logout button
- Tailwind CSS styling

### 5.4 Additional Features

- Demo Classes: Free preview videos for unsubscribed courses
- Announcements Section: Institute notices from dummyData
- Dark Mode: Theme toggle with Context API + Tailwind dark: classes
- Referral System: Unique code display, referral link

## Phase 6: Dummy Data & Mock API

### 6.1 Dummy Data Structure (data/dummyData.js)

```javascript
- users: [] (for login/registration)
- courses: [] (with all details - class, board, subjects, teachers, etc.)
- tests: [] (chapter-wise, weekly, monthly, full syllabus)
- doubts: []
- notifications: []
- subscriptions: []
- liveClasses: []
- recordedLectures: []
- studyMaterials: []
```

### 6.2 Mock API Functions (data/mockAPI.js)

- loginUser(mobile, password) → returns user from dummyData
- sendOTP(mobile) → returns { success: true }
- verifyOTP(mobile, otp) → returns { success: true } (accept any 6 digits)
- registerUser(userData) → saves to dummyData, returns user
- getCourses(class, board) → returns filtered courses
- getCourseDetails(courseId) → returns course
- subscribeCourse(courseId, plan) → returns subscription (mock)
- getTests(courseId) → returns tests
- submitTest(testId, answers) → calculates and returns results
- getDoubts(userId) → returns doubts
- createDoubt(doubtData) → saves to dummyData
- getNotifications(userId) → returns notifications
- All functions use localStorage for persistence
- Simulate delays with setTimeout (200-500ms)

## Phase 7: Routing & State Management

### 7.1 Route Configuration

- Protected routes (require authentication)
- Public routes (onboarding, login, registration)
- Route guards (redirect if not authenticated)
- React Router setup

### 7.2 AuthContext

- User authentication state
- Login/logout functions
- User profile data
- Token management (mock token)
- localStorage persistence

### 7.3 ThemeContext

- Dark/light mode toggle
- Theme persistence in localStorage
- Tailwind dark mode classes

## Phase 8: Custom Video Player

### 8.1 Video Player Component

- HTML5 video element
- Custom controls with Tailwind:
  - Play/Pause button
  - Volume slider
  - Progress bar (seekable)
  - Time display (current/total)
  - Fullscreen button
  - Playback speed dropdown
  - Quality selector (if multiple sources)
- Progress saving to localStorage
- Continue watching functionality
- Responsive design with Tailwind

## Phase 9: Styling with Tailwind CSS

### 9.1 Design System

- Custom color palette in tailwind.config.js
- Consistent spacing (p-4, m-4, gap-4, etc.)
- Typography (text-xl, text-2xl, font-bold, etc.)
- Component styling throughout with Tailwind utilities

### 9.2 Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Responsive navigation (mobile: bottom nav, desktop: sidebar)
- Touch-friendly buttons and inputs

### 9.3 Dark Mode

- Tailwind dark: classes
- Theme toggle button
- Persist theme preference

## Phase 10: Final Polish

### 10.1 Error Handling

- Form validation errors
- Loading states (skeletons)
- Empty states
- Success/error toasts (with Tailwind)

### 10.2 Animations

- Smooth transitions with Tailwind
- Loading animations
- Page transitions

### 10.3 Testing

- Test all flows manually
- Verify dummy data persistence
- Check responsive design
- Test dark mode toggle

### To-dos

- [ ] Install core dependencies (React Router, Axios, React Hook Form, UI library, React Icons, date-fns)
- [ ] Create folder structure and organize components, pages, services, context, hooks, utils
- [ ] Build 3-slide onboarding screen with carousel and Get Started button
- [ ] Implement 3-step registration: Mobile OTP → Profile Form → Final OTP
- [ ] Create AuthContext for user state management and authentication
- [ ] Build student dashboard with trending courses filtered by class/board
- [ ] Create course details page with subscription plans and payment integration
- [ ] Build course content tabs: Live Classes, Recorded Lectures, Study Material, Tests
- [ ] Implement complete test system: Test List → Start → Attempt UI → Results → Review
- [ ] Build Doubts section and Notifications page with real-time updates
- [ ] Create student profile page with subscriptions, payment history, and edit functionality
- [ ] Implement Demo Classes, Announcements, Dark Mode, and Referral System
- [ ] Set up React Router with protected routes and navigation components
- [ ] Create API service layer with axios configuration and all endpoint integrations
- [ ] Apply consistent styling, responsive design, loading states, and error handling