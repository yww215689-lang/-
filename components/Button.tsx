import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = "w-full py-3 px-4 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variants = {
    primary: "bg-blue-600 text-white shadow-blue-200 shadow-md hover:bg-blue-700",
    secondary: "bg-white text-blue-600 border-2 border-blue-100 hover:bg-blue-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
