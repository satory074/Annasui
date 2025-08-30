import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: { width: 100, height: 30, fontSize: 12 },
  md: { width: 150, height: 45, fontSize: 18 },
  lg: { width: 200, height: 60, fontSize: 24 },
  xl: { width: 250, height: 75, fontSize: 30 },
};

export default function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  const { width, height, fontSize } = sizeMap[size];
  const scale = width / 200; // Base size is 200x60

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 200 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      {/* Background circle for brand mark */}
      <circle cx="30" cy="30" r="26" fill="url(#primaryGradient)" opacity="0.1"/>
      
      {/* Main logo symbol: Musical waves/timeline */}
      <g transform="translate(8, 12)">
        {/* First wave (representing first song in medley) */}
        <path d="M4 20 Q8 16 12 20 T20 20" 
              stroke="url(#primaryGradient)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              fill="none"/>
        
        {/* Second wave (representing second song) */}
        <path d="M6 28 Q12 22 18 28 T30 28" 
              stroke="url(#secondaryGradient)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              fill="none"/>
        
        {/* Third wave (representing third song) */}
        <path d="M8 36 Q16 30 24 36 T40 36" 
              stroke="url(#accentGradient)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              fill="none"/>
        
        {/* Timeline markers */}
        <circle cx="6" cy="20" r="2" fill="#ff8c42"/>
        <circle cx="12" cy="28" r="2" fill="#5b6dee"/>
        <circle cx="20" cy="36" r="2" fill="#00d9a3"/>
      </g>
      
      {/* Medlean text */}
      {showText && (
        <text x="70" y="40" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontSize={fontSize} 
              fontWeight="700" 
              fill="url(#textGradient)">
          Medlean
        </text>
      )}
      
      {/* Gradients definition */}
      <defs>
        <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#ff8c42'}}/>
          <stop offset="100%" style={{stopColor:'#ffa55c'}}/>
        </linearGradient>
        
        <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#5b6dee'}}/>
          <stop offset="100%" style={{stopColor:'#4c63d2'}}/>
        </linearGradient>
        
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#00d9a3'}}/>
          <stop offset="100%" style={{stopColor:'#06b981'}}/>
        </linearGradient>
        
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#ff8c42'}}/>
          <stop offset="50%" style={{stopColor:'#5b6dee'}}/>
          <stop offset="100%" style={{stopColor:'#00d9a3'}}/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Icon-only version for compact spaces
export function LogoIcon({ size = 'md', className = '' }: Omit<LogoProps, 'showText'>) {
  return <Logo size={size} className={className} showText={false} />;
}