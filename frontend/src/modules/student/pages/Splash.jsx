import React from 'react';
import { useNavigate } from 'react-router-dom';
import Image from '../components/common/Image';
import Button from '../components/common/Button';
import logoImage from '../assets/logo.png';
import { ROUTES } from '../constants/routes';

/**
 * Splash Screen Page
 * First screen shown when app loads
 */
const Splash = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate(ROUTES.ONBOARDING);
  };

  return (
    <div className="h-screen w-full bg-[var(--app-orange)] flex items-center justify-center px-4">
      {/* All Content - Perfectly Centered */}
      <div className="flex flex-col items-center justify-center gap-3 w-full max-w-md">
        {/* Logo Image */}
        <div className="mb-2">
          <Image 
            src={logoImage}
            alt="D'Vision Academy Logo"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* App Name Text - Centered */}
        <div className="text-center w-full">
          <h1 className="text-3xl md:text-4xl font-bold text-white italic whitespace-nowrap">
            D'Vision Academy
          </h1>
        </div>

        {/* Continue Button - Also Centered */}
        <div className="w-full mt-2">
          <Button
            variant="primary"
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2"
          >
            <span>Continue</span>
            <span className="text-2xl font-bold leading-none">→</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Splash;

