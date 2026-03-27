import React from 'react';

export default function XIcon({ className = '', size = 16, style = {}, ...props }) {
  const mergedStyle = {
    width: size,
    height: size,
    ...style,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={mergedStyle}
      {...props}
    >
      <path d="M18.244 2H21.5l-7.11 8.128L22 22h-5.958l-4.67-6.62L5.58 22H2.322l7.604-8.69L2 2h6.11l4.222 6.02L18.244 2zm-1.045 18h1.8L7.17 3.895H5.24L17.2 20z" />
    </svg>
  );
}
