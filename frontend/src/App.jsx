import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Protected Routes and constants (non-lazy)
import StudentProtectedRoute from './modules/student/components/common/ProtectedRoute';
import { ROUTES as StudentRoutes } from './modules/student/constants/routes';
import AdminProtectedRoute from './modules/admin/components/ProtectedRoute/ProtectedRoute';
import { ROUTES as TeacherRoutes } from './modules/teacher/constants/routes';

// Student Module (lazy)
const StudentLogin = lazy(() => import('./modules/student/pages/Login'));
const StudentRegistrationForm = lazy(() => import('./modules/student/pages/RegistrationForm'));
const StudentFinalOTP = lazy(() => import('./modules/student/pages/FinalOTP'));
const StudentDashboard = lazy(() => import('./modules/student/pages/Dashboard'));
const StudentCourseDetails = lazy(() => import('./modules/student/pages/CourseDetails'));
const StudentNotifications = lazy(() => import('./modules/student/pages/Notifications'));
const StudentMyCourses = lazy(() => import('./modules/student/pages/MyCourses'));
const StudentSubscriptionHistory = lazy(() => import('./modules/student/pages/SubscriptionHistory'));
const StudentSubscriptionPlans = lazy(() => import('./modules/student/pages/SubscriptionPlans'));
const StudentMySubscriptions = lazy(() => import('./modules/student/pages/MySubscriptions'));
const StudentContactUs = lazy(() => import('./modules/student/pages/ContactUs'));
const StudentAboutUs = lazy(() => import('./modules/student/pages/AboutUs'));
const StudentPrivacyPolicy = lazy(() => import('./modules/student/pages/PrivacyPolicy'));
const StudentTermsAndConditions = lazy(() => import('./modules/student/pages/TermsAndConditions'));
const StudentLiveClasses = lazy(() => import('./modules/student/pages/LiveClasses'));
const StudentLiveClassRoom = lazy(() => import('./modules/student/pages/LiveClassRoom'));
const StudentRecordings = lazy(() => import('./modules/student/pages/Recordings'));
const StudentLiveClassView = lazy(() => import('./modules/student/pages/LiveClassView'));
const StudentTimetable = lazy(() => import('./modules/student/pages/Timetable'));
const StudentDoubts = lazy(() => import('./modules/student/pages/Doubts'));
const StudentQuizzes = lazy(() => import('./modules/student/pages/Quizzes'));
const StudentTakeQuiz = lazy(() => import('./modules/student/pages/TakeQuiz'));
const StudentQuizResults = lazy(() => import('./modules/student/pages/QuizResults'));
const StudentProfile = lazy(() => import('./modules/student/pages/Profile'));
const StudentPersonalInformation = lazy(() => import('./modules/student/pages/PersonalInformation'));
const StudentChangePassword = lazy(() => import('./modules/student/pages/ChangePassword'));
const StudentEditProfile = lazy(() => import('./modules/student/pages/EditProfile'));
const StudentReferAndEarn = lazy(() => import('./modules/student/pages/ReferAndEarn'));
const StudentDeleteAccount = lazy(() => import('./modules/student/pages/DeleteAccount'));
const StudentTeacherDetails = lazy(() => import('./modules/student/pages/TeacherDetails'));
const StudentSubjectTopics = lazy(() => import('./modules/student/pages/SubjectTopics'));
const StudentContentView = lazy(() => import('./modules/student/pages/ContentView'));
const StudentPaymentReturn = lazy(() => import('./modules/student/pages/PaymentReturn'));

// Admin Module (lazy)
const AdminLayout = lazy(() => import('./modules/admin/components/Layout/Layout'));
const AdminDashboard = lazy(() => import('./modules/admin/pages/Dashboard/Dashboard'));
const AdminLogin = lazy(() => import('./modules/admin/pages/Login/Login'));
const AdminForgotPassword = lazy(() => import('./modules/admin/pages/ForgotPassword/ForgotPassword'));
const AdminResetPassword = lazy(() => import('./modules/admin/pages/ResetPassword/ResetPassword'));
const AdminStudents = lazy(() => import('./modules/admin/pages/Students/Students'));
const AdminAddStudent = lazy(() => import('./modules/admin/pages/Students/AddStudent'));
const AdminEditStudent = lazy(() => import('./modules/admin/pages/Students/EditStudent'));
const AdminViewStudent = lazy(() => import('./modules/admin/pages/Students/ViewStudent'));
const AdminTeachers = lazy(() => import('./modules/admin/pages/Teachers/Teachers'));
const AdminAddTeacher = lazy(() => import('./modules/admin/pages/Teachers/AddTeacher'));
const AdminEditTeacher = lazy(() => import('./modules/admin/pages/Teachers/EditTeacher'));
const AdminAttendance = lazy(() => import('./modules/admin/pages/Attendance/Attendance'));
const AdminAddAttendance = lazy(() => import('./modules/admin/pages/Attendance/AddAttendance'));
const AdminEditAttendance = lazy(() => import('./modules/admin/pages/Attendance/EditAttendance'));
const AdminMarkAttendance = lazy(() => import('./modules/admin/pages/Attendance/MarkAttendance'));
const AdminAttendanceReports = lazy(() => import('./modules/admin/pages/Attendance/AttendanceReports'));
const AdminClasses = lazy(() => import('./modules/admin/pages/Classes/Classes'));
const AdminAddClass = lazy(() => import('./modules/admin/pages/Classes/AddClass'));
const AdminEditClass = lazy(() => import('./modules/admin/pages/Classes/EditClass'));
const AdminSubjects = lazy(() => import('./modules/admin/pages/Subjects/Subjects'));
const AdminAddSubject = lazy(() => import('./modules/admin/pages/Subjects/AddSubject'));
const AdminEditSubject = lazy(() => import('./modules/admin/pages/Subjects/EditSubject'));
const AdminCourses = lazy(() => import('./modules/admin/pages/Courses/Courses'));
const AdminAddCourse = lazy(() => import('./modules/admin/pages/Courses/AddCourse'));
const AdminEditCourse = lazy(() => import('./modules/admin/pages/Courses/EditCourse'));
const AdminQuizzes = lazy(() => import('./modules/admin/pages/Quizzes/Quizzes'));
const AdminAddQuiz = lazy(() => import('./modules/admin/pages/Quizzes/AddQuiz'));
const AdminEditQuiz = lazy(() => import('./modules/admin/pages/Quizzes/EditQuiz'));
const AdminViewQuiz = lazy(() => import('./modules/admin/pages/Quizzes/ViewQuiz'));
const AdminQuizResults = lazy(() => import('./modules/admin/pages/Quizzes/QuizResults'));
const AdminSubscriptions = lazy(() => import('./modules/admin/pages/Subscriptions/Subscriptions'));
const AdminAddSubscription = lazy(() => import('./modules/admin/pages/Subscriptions/AddSubscription'));
const AdminEditSubscription = lazy(() => import('./modules/admin/pages/Subscriptions/EditSubscription'));
const AdminTransactions = lazy(() => import('./modules/admin/pages/Transactions/Transactions'));
const AdminBanners = lazy(() => import('./modules/admin/pages/Banners/Banners'));
const AdminAddBanner = lazy(() => import('./modules/admin/pages/Banners/AddBanner'));
const AdminEditBanner = lazy(() => import('./modules/admin/pages/Banners/EditBanner'));
const AdminTimeTable = lazy(() => import('./modules/admin/pages/TimeTable/TimeTable'));
const AdminAddTimeTable = lazy(() => import('./modules/admin/pages/TimeTable/AddTimeTable'));
const AdminEditTimeTable = lazy(() => import('./modules/admin/pages/TimeTable/EditTimeTable'));
const AdminCourseDetail = lazy(() => import('./modules/admin/pages/TimeTable/CourseDetail'));
const AdminDoubts = lazy(() => import('./modules/admin/pages/Doubts/Doubts'));
const AdminEditDoubts = lazy(() => import('./modules/admin/pages/Doubts/EditDoubts'));
const AdminQuiz = lazy(() => import('./modules/admin/pages/Quiz/Quiz'));
const AdminAddQuizNew = lazy(() => import('./modules/admin/pages/Quiz/AddQuiz'));
const AdminEditQuizNew = lazy(() => import('./modules/admin/pages/Quiz/EditQuiz'));
const AdminContent = lazy(() => import('./modules/admin/pages/Content/Content'));
const AdminEditContent = lazy(() => import('./modules/admin/pages/Content/EditContent'));
const AdminAgents = lazy(() => import('./modules/admin/pages/Agent/Agents'));
const AdminAgentReferrals = lazy(() => import('./modules/admin/pages/Agent/AgentReferrals'));
const AdminTeacherClass = lazy(() => import('./modules/admin/pages/TeacherClass/TeacherClass'));
const AdminTeacherClassDetail = lazy(() => import('./modules/admin/pages/TeacherClass/TeacherClassDetail'));
const AdminRecordedSession = lazy(() => import('./modules/admin/pages/RecordedSession/RecordedSession'));
const AdminNotificationsList = lazy(() => import('./modules/admin/pages/Notifications/NotificationsList'));
const AdminAddNotification = lazy(() => import('./modules/admin/pages/Notifications/AddNotification'));
const AdminMyNotifications = lazy(() => import('./modules/admin/pages/Notifications/MyNotifications'));

// Teacher/Agent Module (lazy)
const TeacherLogin = lazy(() => import('./modules/teacher/pages/Login'));
const TeacherFinalOTP = lazy(() => import('./modules/teacher/pages/FinalOTP'));
const TeacherDashboard = lazy(() => import('./modules/teacher/pages/Dashboard'));
const TeacherAttendance = lazy(() => import('./modules/teacher/pages/Attendance'));
const TeacherLiveClasses = lazy(() => import('./modules/teacher/pages/LiveClasses'));
const TeacherSchedule = lazy(() => import('./modules/teacher/pages/Schedule'));
const TeacherCreateLiveClass = lazy(() => import('./modules/teacher/pages/CreateLiveClass'));
const TeacherEditLiveClass = lazy(() => import('./modules/teacher/pages/EditLiveClass'));
const TeacherLiveClassRoom = lazy(() => import('./modules/teacher/pages/LiveClassRoom'));
const TeacherDoubts = lazy(() => import('./modules/teacher/pages/Doubts'));
const TeacherProfile = lazy(() => import('./modules/teacher/pages/Profile'));
const TeacherPersonalInformation = lazy(() => import('./modules/teacher/pages/PersonalInformation'));
const TeacherNotifications = lazy(() => import('./modules/teacher/pages/Notifications'));
const TeacherContentView = lazy(() => import('./modules/teacher/pages/ContentView'));
const TeacherQuizzes = lazy(() => import('./modules/teacher/pages/Quizzes'));
const TeacherAddQuiz = lazy(() => import('./modules/teacher/pages/AddQuiz'));
const TeacherEditQuiz = lazy(() => import('./modules/teacher/pages/EditQuiz'));
const TeacherViewQuiz = lazy(() => import('./modules/teacher/pages/ViewQuiz'));
const TeacherQuizResults = lazy(() => import('./modules/teacher/pages/QuizResults'));
const AgentDashboard = lazy(() => import('./modules/teacher/pages/AgentDashboard'));
const AgentStatistics = lazy(() => import('./modules/teacher/pages/AgentStatistics'));
const AgentProfile = lazy(() => import('./modules/teacher/pages/AgentProfile'));
const AgentEditProfile = lazy(() => import('./modules/teacher/pages/AgentEditProfile'));
const AgentPersonalInformation = lazy(() => import('./modules/teacher/pages/AgentPersonalInformation'));
const AgentReferrals = lazy(() => import('./modules/teacher/pages/AgentReferrals'));
const AgentNotifications = lazy(() => import('./modules/teacher/pages/AgentNotifications'));
const AgentBankDetails = lazy(() => import('./modules/teacher/pages/BankDetails'));

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-teal)] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        }
      >
        <Routes>
          {/* Student Routes - Root paths */}
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/registration" element={<StudentRegistrationForm />} />
          <Route path="/final-otp" element={<StudentFinalOTP />} />
          <Route
            path="/dashboard"
            element={
              <StudentProtectedRoute>
                <StudentDashboard />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/course/:id"
            element={
              <StudentProtectedRoute>
                <StudentCourseDetails />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/course/:courseId/teachers/:teacherIndex"
            element={
              <StudentProtectedRoute>
                <StudentTeacherDetails />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/course/:courseId/subject/:subjectName"
            element={
              <StudentProtectedRoute>
                <StudentSubjectTopics />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <StudentProtectedRoute>
                <StudentNotifications />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <StudentProtectedRoute>
                <StudentMyCourses />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/subscription-history"
            element={
              <StudentProtectedRoute>
                <StudentSubscriptionHistory />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/subscription-plans"
            element={
              <StudentProtectedRoute>
                <StudentSubscriptionPlans />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/my-subscriptions"
            element={
              <StudentProtectedRoute>
                <StudentMySubscriptions />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/contact-us"
            element={
              <StudentProtectedRoute>
                <StudentContactUs />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/about-us"
            element={
              <StudentProtectedRoute>
                <StudentAboutUs />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/privacy-policy"
            element={
              <StudentProtectedRoute>
                <StudentPrivacyPolicy />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/terms-and-conditions"
            element={
              <StudentProtectedRoute>
                <StudentTermsAndConditions />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/content/:type"
            element={
              <StudentProtectedRoute>
                <StudentContentView />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/live-classes"
            element={
              <StudentProtectedRoute>
                <StudentLiveClasses />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/live-class/:id"
            element={
              <StudentProtectedRoute>
                <StudentLiveClassRoom />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/recordings"
            element={
              <StudentProtectedRoute>
                <StudentRecordings />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/recording/:id"
            element={
              <StudentProtectedRoute>
                <StudentLiveClassView />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <StudentProtectedRoute>
                <StudentTimetable />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/doubts"
            element={
              <StudentProtectedRoute>
                <StudentDoubts />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <StudentProtectedRoute>
                <StudentQuizzes />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <StudentProtectedRoute>
                <StudentTakeQuiz />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/quiz-results/:id"
            element={
              <StudentProtectedRoute>
                <StudentQuizResults />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <StudentProtectedRoute>
                <StudentProfile />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/personal-information"
            element={
              <StudentProtectedRoute>
                <StudentPersonalInformation />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <StudentProtectedRoute>
                <StudentChangePassword />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <StudentProtectedRoute>
                <StudentEditProfile />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/refer-and-earn"
            element={
              <StudentProtectedRoute>
                <StudentReferAndEarn />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/delete-account"
            element={
              <StudentProtectedRoute>
                <StudentDeleteAccount />
              </StudentProtectedRoute>
            }
          />
          <Route
            path="/payment/return"
            element={
              <StudentProtectedRoute>
                <StudentPaymentReturn />
              </StudentProtectedRoute>
            }
          />

          {/* Admin Routes - /admin/* */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password/:resetToken" element={<AdminResetPassword />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminStudents />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/students/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddStudent />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/students/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditStudent />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/students/view/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminViewStudent />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminTeachers />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddTeacher />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditTeacher />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAttendance />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddAttendance />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditAttendance />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance/mark"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminMarkAttendance />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance/reports"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAttendanceReports />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminClasses />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddClass />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditClass />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminSubjects />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddSubject />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditSubject />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminCourses />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddCourse />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditCourse />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminQuizzes />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddQuiz />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditQuiz />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/view/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminViewQuiz />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quizzes/:id/results"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminQuizResults />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminSubscriptions />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddSubscription />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditSubscription />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminTransactions />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/banners"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminBanners />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/banners/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddBanner />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/banners/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditBanner />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminTimeTable />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddTimeTable />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditTimeTable />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable/course/:classId"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminCourseDetail />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable/edit-course/:classId"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddTimeTable />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/doubts"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminDoubts />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/doubts/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditDoubts />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quiz"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminQuiz />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quiz/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddQuizNew />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/quiz/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditQuizNew />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/content"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminContent />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/content/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminEditContent />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/agents"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAgents />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/agents/:id/referrals"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAgentReferrals />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/teacher-class"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminTeacherClass />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/teacher-class/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminTeacherClassDetail />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/recorded-session"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminRecordedSession />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminNotificationsList />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications/add"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddNotification />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications/edit/:id"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminAddNotification />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/my-notifications"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <AdminMyNotifications />
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />

          {/* Teacher Routes - /teacher/* */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/final-otp" element={<TeacherFinalOTP />} />
          <Route path={TeacherRoutes.DASHBOARD} element={<TeacherDashboard />} />
          <Route path={TeacherRoutes.ATTENDANCE} element={<TeacherAttendance />} />
          <Route path={TeacherRoutes.LIVE_CLASSES} element={<TeacherLiveClasses />} />
          <Route path="/teacher/schedule" element={<TeacherSchedule />} />
          <Route path={TeacherRoutes.CREATE_LIVE_CLASS} element={<TeacherCreateLiveClass />} />
          <Route path={TeacherRoutes.EDIT_LIVE_CLASS} element={<TeacherEditLiveClass />} />
          <Route path="/teacher/live-class/:id" element={<TeacherLiveClassRoom />} />
          <Route path={TeacherRoutes.DOUBTS} element={<TeacherDoubts />} />
          <Route path={TeacherRoutes.PROFILE} element={<TeacherProfile />} />
          <Route path={TeacherRoutes.PERSONAL_INFORMATION} element={<TeacherPersonalInformation />} />
          <Route path={TeacherRoutes.NOTIFICATIONS} element={<TeacherNotifications />} />
          <Route path={TeacherRoutes.QUIZZES} element={<TeacherQuizzes />} />
          <Route path={TeacherRoutes.ADD_QUIZ} element={<TeacherAddQuiz />} />
          <Route path={TeacherRoutes.EDIT_QUIZ} element={<TeacherEditQuiz />} />
          <Route path={TeacherRoutes.VIEW_QUIZ} element={<TeacherViewQuiz />} />
          <Route path={TeacherRoutes.QUIZ_RESULTS} element={<TeacherQuizResults />} />
          <Route path="/teacher/content/:type" element={<TeacherContentView />} />

          {/* Agent Routes - /agent/* */}
          <Route path={TeacherRoutes.AGENT_DASHBOARD} element={<AgentDashboard />} />
          <Route path={TeacherRoutes.AGENT_STATISTICS} element={<AgentStatistics />} />
          <Route path={TeacherRoutes.AGENT_REFERRALS} element={<AgentReferrals />} />
          <Route path={TeacherRoutes.AGENT_PROFILE} element={<AgentProfile />} />
          <Route path={TeacherRoutes.AGENT_EDIT_PROFILE} element={<AgentEditProfile />} />
          <Route path={TeacherRoutes.AGENT_PERSONAL_INFORMATION} element={<AgentPersonalInformation />} />
          <Route path={TeacherRoutes.AGENT_BANK_DETAILS} element={<AgentBankDetails />} />
          <Route path={TeacherRoutes.AGENT_NOTIFICATIONS} element={<AgentNotifications />} />

          {/* Root redirect - default to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
