import React from 'react';

/**
 * Reusable Button Component
 * Supports different variants and sizes
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  onClick,
  className = '',
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--app-teal)] text-white hover:opacity-90',
    secondary: 'bg-white border-2 border-[var(--app-teal)] text-[var(--app-teal)] hover:bg-[var(--app-teal)] hover:text-white',
    outline: 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-[var(--app-teal)]'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

