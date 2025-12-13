import React from 'react';

/**
 * Reusable Container Component
 * Provides consistent layout and spacing
 */
const Container = ({ 
  children, 
  className = '', 
  fullHeight = false,
  centerContent = false 
}) => {
  return (
    <div 
      className={`
        w-full 
        ${fullHeight ? 'min-h-screen' : ''}
        ${centerContent ? 'flex items-center justify-center' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Container;

