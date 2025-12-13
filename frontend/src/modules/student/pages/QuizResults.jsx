import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

const QuizResults = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [topStudents, setTopStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      console.error('Quiz ID is missing from URL');
      navigate('/quizzes');
      return;
    }
    fetchAllData();
  }, [id, navigate]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quizResponse, leaderboardResponse] = await Promise.all([
        studentAPI.getQuizById(id),
        studentAPI.getQuizLeaderboard(id).catch(err => {
          if (err.status === 403) {
            return { success: false, message: err.message };
          }
          throw err;
        })
      ]);

      if (quizResponse.success && quizResponse.data?.quiz) {
        setQuiz(quizResponse.data.quiz);
      }

      if (leaderboardResponse.success && leaderboardResponse.data) {
        setTopStudents(leaderboardResponse.data.topStudents || []);
        setSubmissionData(leaderboardResponse.data.currentStudentSubmission);
      } else {
        try {
          const submissionResponse = await studentAPI.getSubmissionStatus(id);
          if (submissionResponse.success && submissionResponse.data?.submission) {
            setSubmissionData(submissionResponse.data.submission);
          }
        } catch (subErr) {
          console.error('Error fetching submission:', subErr);
        }
        setError(leaderboardResponse.message || 'Results are not available yet');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-[var(--app-dark-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base font-medium">Loading results...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Quiz Results</h1>
              {quiz && (
                <p className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1">{quiz.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 pb-20 sm:pb-24">
        {error && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
            <p className="text-yellow-800 text-xs sm:text-sm font-medium">{error}</p>
          </div>
        )}
        
        {/* Top 3 Students Section - Podium Style */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5 mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 md:mb-6">
            <FiAward className="text-[var(--app-dark-blue)] text-base sm:text-lg md:text-xl" />
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
              Leaderboard
            </h2>
          </div>
          
          {topStudents.length > 0 ? (
            <div className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 sm:mb-5 md:mb-6">
              {/* 2nd Place - Left */}
              {topStudents.length >= 2 && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="relative mb-1.5 sm:mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center mb-1.5 sm:mb-2">
                      <FiUser className="text-gray-600 text-lg sm:text-xl md:text-2xl lg:text-3xl" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-white text-[10px] sm:text-xs font-bold">2</span>
                    </div>
                  </div>
                  <p className="font-bold text-gray-800 text-[10px] sm:text-xs md:text-sm text-center mb-0.5 sm:mb-1">
                    {topStudents[1]?.name || 'Player Name'}
                  </p>
                  <p className="font-bold text-gray-700 text-xs sm:text-sm md:text-base lg:text-lg">
                    {topStudents[1]?.score || 0}/{topStudents[1]?.total || 0}
                  </p>
                  <p className="text-gray-500 text-[10px] sm:text-xs">
                    {topStudents[1] ? Math.round((topStudents[1].score / topStudents[1].total) * 100) : 0}%
                  </p>
                </div>
              )}

              {/* 1st Place - Center */}
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-1.5 sm:mb-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full bg-amber-200 border-2 sm:border-4 border-amber-400 flex items-center justify-center mb-1.5 sm:mb-2 shadow-lg">
                    <FiUser className="text-amber-700 text-xl sm:text-2xl md:text-3xl lg:text-4xl" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    <span className="text-white text-xs sm:text-sm md:text-base font-bold">1</span>
                  </div>
                </div>
                <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base lg:text-lg text-center mb-0.5 sm:mb-1">
                  {topStudents[0]?.name || 'Player Name'}
                </p>
                <p className="font-bold text-amber-600 text-sm sm:text-base md:text-lg lg:text-xl">
                  {topStudents[0]?.score || 0}/{topStudents[0]?.total || 0}
                </p>
                <p className="text-gray-500 text-[10px] sm:text-xs">
                  {topStudents[0] ? Math.round((topStudents[0].score / topStudents[0].total) * 100) : 0}%
                </p>
              </div>

              {/* 3rd Place - Right */}
              {topStudents.length >= 3 && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="relative mb-1.5 sm:mb-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-orange-200 border-2 border-orange-300 flex items-center justify-center mb-1.5 sm:mb-2">
                      <FiUser className="text-orange-600 text-lg sm:text-xl md:text-2xl lg:text-3xl" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-orange-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-white text-[10px] sm:text-xs font-bold">3</span>
                    </div>
                  </div>
                  <p className="font-bold text-gray-800 text-[10px] sm:text-xs md:text-sm text-center mb-0.5 sm:mb-1">
                    {topStudents[2]?.name || 'Player Name'}
                  </p>
                  <p className="font-bold text-gray-700 text-xs sm:text-sm md:text-base lg:text-lg">
                    {topStudents[2]?.score || 0}/{topStudents[2]?.total || 0}
                  </p>
                  <p className="text-gray-500 text-[10px] sm:text-xs">
                    {topStudents[2] ? Math.round((topStudents[2].score / topStudents[2].total) * 100) : 0}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="font-medium text-sm sm:text-base">No results available yet</p>
            </div>
          )}
        </div>

        {/* Current Student's Result Section - Only show if student has submitted */}
        {submissionData && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
            <div className="mb-3 sm:mb-4 md:mb-5">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
                Your Performance
              </h2>
            </div>

            <div className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm sm:text-base md:text-lg mb-0.5 sm:mb-1">
                    {user?.name || user?.fullName || 'You'}
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Submitted: {new Date(submissionData.submittedAt).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div className="text-center sm:text-right">
                  <p className="font-bold text-[var(--app-dark-blue)] text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                    {submissionData.score}/{submissionData.totalQuestions || quiz?.questions?.length || 20}
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {Math.round((submissionData.score / (submissionData.totalQuestions || quiz?.questions?.length || 20)) * 100)}%
                    {submissionData.rank && ` • Rank #${submissionData.rank}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default QuizResults;
