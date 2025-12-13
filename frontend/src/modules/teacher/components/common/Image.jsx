import React from 'react';

/**
 * Reusable Image Component
 * Handles image loading and error states
 */
const Image = ({ 
  src, 
  alt = '', 
  className = '',
  ...props 
}) => {
  return (
    <img 
      src={src} 
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default Image;

