import React from 'react';

/**
 * Reusable Input Component
 * Supports different input types and icons
 */
const Input = ({ 
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  icon,
  rightIcon,
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--app-black)] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full px-4 py-3 rounded-xl border-2 border-[var(--app-teal)]/30 bg-[#FFFFFF]
            focus:outline-none focus:ring-2 focus:ring-[var(--app-teal)] 
            focus:border-[var(--app-teal)] transition-all
            text-[var(--app-black)] placeholder:text-[var(--app-black)]/50
            ${icon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;

