import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Student Module Imports
import StudentLogin from './modules/student/pages/Login';
import StudentRegistrationForm from './modules/student/pages/RegistrationForm';
import StudentFinalOTP from './modules/student/pages/FinalOTP';
import StudentDashboard from './modules/student/pages/Dashboard';
import StudentCourseDetails from './modules/student/pages/CourseDetails';
import StudentNotifications from './modules/student/pages/Notifications';
import StudentMyCourses from './modules/student/pages/MyCourses';
import StudentSubscriptionHistory from './modules/student/pages/SubscriptionHistory';
import StudentSubscriptionPlans from './modules/student/pages/SubscriptionPlans';
import StudentMySubscriptions from './modules/student/pages/MySubscriptions';
import StudentContactUs from './modules/student/pages/ContactUs';
import StudentAboutUs from './modules/student/pages/AboutUs';
import StudentPrivacyPolicy from './modules/student/pages/PrivacyPolicy';
import StudentTermsAndConditions from './modules/student/pages/TermsAndConditions';
import StudentLiveClasses from './modules/student/pages/LiveClasses';
import StudentLiveClassRoom from './modules/student/pages/LiveClassRoom';
import StudentRecordings from './modules/student/pages/Recordings';
import StudentTimetable from './modules/student/pages/Timetable';
import StudentDoubts from './modules/student/pages/Doubts';
import StudentQuizzes from './modules/student/pages/Quizzes';
import StudentTakeQuiz from './modules/student/pages/TakeQuiz';
import StudentQuizResults from './modules/student/pages/QuizResults';
import StudentProfile from './modules/student/pages/Profile';
import StudentPersonalInformation from './modules/student/pages/PersonalInformation';
import StudentChangePassword from './modules/student/pages/ChangePassword';
import StudentEditProfile from './modules/student/pages/EditProfile';
import StudentReferAndEarn from './modules/student/pages/ReferAndEarn';
import StudentDeleteAccount from './modules/student/pages/DeleteAccount';
import StudentTeacherDetails from './modules/student/pages/TeacherDetails';
import StudentSubjectTopics from './modules/student/pages/SubjectTopics';
import StudentContentView from './modules/student/pages/ContentView';
import StudentProtectedRoute from './modules/student/components/common/ProtectedRoute';
import { ROUTES as StudentRoutes } from './modules/student/constants/routes';

// Admin Module Imports
import AdminLayout from './modules/admin/components/Layout/Layout';
import AdminDashboard from './modules/admin/pages/Dashboard/Dashboard';
import AdminLogin from './modules/admin/pages/Login/Login';
import AdminForgotPassword from './modules/admin/pages/ForgotPassword/ForgotPassword';
import AdminResetPassword from './modules/admin/pages/ResetPassword/ResetPassword';
import AdminStudents from './modules/admin/pages/Students/Students';
import AdminAddStudent from './modules/admin/pages/Students/AddStudent';
import AdminEditStudent from './modules/admin/pages/Students/EditStudent';
import AdminTeachers from './modules/admin/pages/Teachers/Teachers';
import AdminAddTeacher from './modules/admin/pages/Teachers/AddTeacher';
import AdminEditTeacher from './modules/admin/pages/Teachers/EditTeacher';
import AdminAttendance from './modules/admin/pages/Attendance/Attendance';
import AdminAddAttendance from './modules/admin/pages/Attendance/AddAttendance';
import AdminEditAttendance from './modules/admin/pages/Attendance/EditAttendance';
import AdminMarkAttendance from './modules/admin/pages/Attendance/MarkAttendance';
import AdminAttendanceReports from './modules/admin/pages/Attendance/AttendanceReports';
import AdminClasses from './modules/admin/pages/Classes/Classes';
import AdminAddClass from './modules/admin/pages/Classes/AddClass';
import AdminEditClass from './modules/admin/pages/Classes/EditClass';
import AdminSubjects from './modules/admin/pages/Subjects/Subjects';
import AdminAddSubject from './modules/admin/pages/Subjects/AddSubject';
import AdminEditSubject from './modules/admin/pages/Subjects/EditSubject';
import AdminCourses from './modules/admin/pages/Courses/Courses';
import AdminAddCourse from './modules/admin/pages/Courses/AddCourse';
import AdminEditCourse from './modules/admin/pages/Courses/EditCourse';
import AdminQuizzes from './modules/admin/pages/Quizzes/Quizzes';
import AdminAddQuiz from './modules/admin/pages/Quizzes/AddQuiz';
import AdminEditQuiz from './modules/admin/pages/Quizzes/EditQuiz';
import AdminViewQuiz from './modules/admin/pages/Quizzes/ViewQuiz';
import AdminQuizResults from './modules/admin/pages/Quizzes/QuizResults';
import AdminSubscriptions from './modules/admin/pages/Subscriptions/Subscriptions';
import AdminAddSubscription from './modules/admin/pages/Subscriptions/AddSubscription';
import AdminEditSubscription from './modules/admin/pages/Subscriptions/EditSubscription';
import AdminTransactions from './modules/admin/pages/Transactions/Transactions';
import AdminBanners from './modules/admin/pages/Banners/Banners';
import AdminAddBanner from './modules/admin/pages/Banners/AddBanner';
import AdminEditBanner from './modules/admin/pages/Banners/EditBanner';
import AdminTimeTable from './modules/admin/pages/TimeTable/TimeTable';
import AdminAddTimeTable from './modules/admin/pages/TimeTable/AddTimeTable';
import AdminEditTimeTable from './modules/admin/pages/TimeTable/EditTimeTable';
import AdminCourseDetail from './modules/admin/pages/TimeTable/CourseDetail';
import AdminDoubts from './modules/admin/pages/Doubts/Doubts';
import AdminEditDoubts from './modules/admin/pages/Doubts/EditDoubts';
import AdminQuiz from './modules/admin/pages/Quiz/Quiz';
import AdminAddQuizNew from './modules/admin/pages/Quiz/AddQuiz';
import AdminEditQuizNew from './modules/admin/pages/Quiz/EditQuiz';
import AdminContent from './modules/admin/pages/Content/Content';
import AdminEditContent from './modules/admin/pages/Content/EditContent';
import AdminReferrals from './modules/admin/pages/Referrals/Referrals';
import AdminTeacherClass from './modules/admin/pages/TeacherClass/TeacherClass';
import AdminRecordedSession from './modules/admin/pages/RecordedSession/RecordedSession';
import AdminNotificationsList from './modules/admin/pages/Notifications/NotificationsList';
import AdminAddNotification from './modules/admin/pages/Notifications/AddNotification';
import AdminMyNotifications from './modules/admin/pages/Notifications/MyNotifications';
import AdminProtectedRoute from './modules/admin/components/ProtectedRoute/ProtectedRoute';

// Teacher Module Imports
import TeacherLogin from './modules/teacher/pages/Login';
import TeacherFinalOTP from './modules/teacher/pages/FinalOTP';
import TeacherDashboard from './modules/teacher/pages/Dashboard';
import TeacherAttendance from './modules/teacher/pages/Attendance';
import TeacherLiveClasses from './modules/teacher/pages/LiveClasses';
import TeacherSchedule from './modules/teacher/pages/Schedule';
import TeacherCreateLiveClass from './modules/teacher/pages/CreateLiveClass';
import TeacherEditLiveClass from './modules/teacher/pages/EditLiveClass';
import TeacherLiveClassRoom from './modules/teacher/pages/LiveClassRoom';
import TeacherDoubts from './modules/teacher/pages/Doubts';
import TeacherProfile from './modules/teacher/pages/Profile';
import TeacherPersonalInformation from './modules/teacher/pages/PersonalInformation';
import TeacherNotifications from './modules/teacher/pages/Notifications';
import TeacherContentView from './modules/teacher/pages/ContentView';
import TeacherQuizzes from './modules/teacher/pages/Quizzes';
import TeacherAddQuiz from './modules/teacher/pages/AddQuiz';
import TeacherEditQuiz from './modules/teacher/pages/EditQuiz';
import TeacherViewQuiz from './modules/teacher/pages/ViewQuiz';
import TeacherQuizResults from './modules/teacher/pages/QuizResults';
import { ROUTES as TeacherRoutes } from './modules/teacher/constants/routes';

function App() {
  return (
    <BrowserRouter>
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
          path="/admin/referrals"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AdminReferrals />
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

        {/* Root redirect - default to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
