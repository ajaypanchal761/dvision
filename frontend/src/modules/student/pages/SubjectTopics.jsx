import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';

/**
 * Subject Topics Page
 * Shows topics and subtopics for a specific subject
 */
const SubjectTopics = () => {
  const { courseId, subjectName } = useParams();
  const navigate = useNavigate();

  // Decode subject name from URL
  const decodedSubjectName = decodeURIComponent(subjectName || '');

  // Dummy data for topics and subtopics based on subject
  const getTopicsForSubject = (subject) => {
    const topicsData = {
      'Physics': [
        {
          topic: 'Electrostatics',
          subtopics: [
            'Electric Charges & Fields',
            'Electrostatic Potential',
            'Capacitance'
          ]
        },
        {
          topic: 'Current Electricity',
          subtopics: [
            'Current Electricity',
            'Potentiometer'
          ]
        },
        {
          topic: 'Electromagnetic Waves',
          subtopics: [
            'Electromagnetic Waves',
            'Electromagnetic spectrum'
          ]
        },
        {
          topic: 'Electromagnetic Induction & AC',
          subtopics: [
            'Electromagnetic Induction',
            'Alternating Current'
          ]
        }
      ],
      'Chemistry': [
        {
          topic: 'Organic Chemistry',
          subtopics: [
            'Basic Principles',
            'Hydrocarbons',
            'Functional Groups'
          ]
        },
        {
          topic: 'Inorganic Chemistry',
          subtopics: [
            'Periodic Table',
            'Chemical Bonding',
            'Coordination Compounds'
          ]
        },
        {
          topic: 'Physical Chemistry',
          subtopics: [
            'Thermodynamics',
            'Chemical Kinetics',
            'Equilibrium'
          ]
        }
      ],
      'Mathematics': [
        {
          topic: 'Algebra',
          subtopics: [
            'Linear Equations',
            'Quadratic Equations',
            'Polynomials'
          ]
        },
        {
          topic: 'Geometry',
          subtopics: [
            'Triangles',
            'Circles',
            'Coordinate Geometry'
          ]
        },
        {
          topic: 'Calculus',
          subtopics: [
            'Limits',
            'Derivatives',
            'Integrals'
          ]
        }
      ],
      'Biology': [
        {
          topic: 'Cell Biology',
          subtopics: [
            'Cell Structure',
            'Cell Division',
            'Cell Functions'
          ]
        },
        {
          topic: 'Genetics',
          subtopics: [
            'Mendelian Genetics',
            'Molecular Genetics',
            'Evolution'
          ]
        }
      ],
      'English': [
        {
          topic: 'Grammar',
          subtopics: [
            'Parts of Speech',
            'Tenses',
            'Sentence Structure'
          ]
        },
        {
          topic: 'Literature',
          subtopics: [
            'Poetry',
            'Prose',
            'Drama'
          ]
        }
      ]
    };

    return topicsData[subject] || [
      {
        topic: 'Introduction',
        subtopics: ['Basic Concepts', 'Fundamentals']
      }
    ];
  };

  const topics = getTopicsForSubject(decodedSubjectName);

  return (
    <div className="min-h-screen w-full bg-blue-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10 rounded-b-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 sm:p-2 hover:bg-[var(--app-beige)] rounded-full transition-colors"
          >
            <FiArrowLeft className="text-[var(--app-black)] text-lg sm:text-xl md:text-2xl" />
          </button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--app-black)]">
            {decodedSubjectName}
          </h1>
          <div className="w-8 sm:w-10"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {topics.map((topicItem, topicIdx) => (
            <div key={topicIdx}>
              {/* Topic Heading */}
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-[var(--app-black)] mb-2 sm:mb-3">
                {topicItem.topic}
              </h2>
              
              {/* Subtopics List */}
              <div className="space-y-1 sm:space-y-2 ml-2 sm:ml-3">
                {topicItem.subtopics.map((subtopic, subtopicIdx) => (
                  <button
                    key={subtopicIdx}
                    onClick={() => {
                      // Navigate to subtopic details if needed
                      console.log(`Navigate to ${subtopic} details`);
                    }}
                    className="w-full flex items-center justify-between py-2 sm:py-2.5 px-2 sm:px-3 hover:bg-[var(--app-beige)] rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 text-left">
                      <span className="text-[var(--app-black)]/40 text-xs sm:text-sm">•</span>
                      <span className="text-sm sm:text-base text-gray-600 group-hover:text-[var(--app-black)] transition-colors">
                        {subtopic}
                      </span>
                    </div>
                    <FiChevronRight className="text-gray-400 text-base sm:text-lg flex-shrink-0 group-hover:text-[var(--app-teal)] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default SubjectTopics;

