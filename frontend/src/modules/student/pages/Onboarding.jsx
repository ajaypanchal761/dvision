import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from '../components/common/Image';
import Button from '../components/common/Button';
import { ROUTES } from '../constants/routes';
import splash2Image from '../assets/splash2.png';
import splash3Image from '../assets/splash3.png';
import splash4Image from '../assets/splash4.png';

/**
 * Onboarding Page with 3 slides
 * Shows app features and benefits
 */
const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: splash2Image,
      title: "Welcome to D'Vision Academy",
      description: "Your go-to platform for live sessions and on-demand courses. We're excited to help you learn and grow!",
    },
    {
      image: splash3Image,
      title: "Live Session with Teachers",
      description: "Join live with top teachers. Session-based study with real-time feedback and support.",
    },
    {
      image: splash4Image,
      title: "Engage with Quizzes",
      description: "Test your knowledge with interactive quizzes. Track your progress and reinforce your learning!",
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Onboarding complete - Navigate to Login
      navigate(ROUTES.LOGIN);
    }
  };

  const handleSkip = () => {
    // Skip onboarding - Navigate to Login
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--app-white)] flex flex-col relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        {/* Image */}
        <div className="mb-6 sm:mb-8 flex-shrink-0">
          <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-[var(--app-dark-blue)] rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center shadow-lg">
            <Image 
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--app-dark-blue)] text-center mb-3 sm:mb-4 italic px-4">
          {slides[currentSlide].title}
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[var(--app-black)] text-center max-w-md mb-6 sm:mb-8 leading-relaxed px-4">
          {slides[currentSlide].description}
        </p>

        {/* Pagination Dots */}
        <div className="flex gap-2 mb-6 sm:mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-[var(--app-dark-blue)] w-6 sm:w-8' 
                  : 'bg-[var(--app-dark-blue)]/30 w-2'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="px-4 sm:px-6 md:px-8 pb-5 sm:pb-8 pt-3 sm:pt-4 flex gap-3 sm:gap-4">
        <button
          onClick={handleSkip}
          className="flex-1 bg-white border-2 border-[var(--app-dark-blue)] text-[var(--app-dark-blue)] hover:bg-[var(--app-dark-blue)] hover:text-white font-semibold text-xs sm:text-sm md:text-base py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-[var(--app-dark-blue)] text-white font-semibold text-xs sm:text-sm md:text-base py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;

