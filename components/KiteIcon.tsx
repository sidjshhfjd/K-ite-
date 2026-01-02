import React from 'react';

interface IconProps {
  className?: string;
}

export const KiteIcon: React.FC<IconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22v-9" />
      <path d="m12 13 8-7-8-4-8 4 8 7Z" />
      <path d="m16 8.5 2.5 1.5" />
      <path d="m8 8.5-2.5 1.5" />
    </svg>
  );
};