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

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 200 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
      aria-label="Medlean - メドレー注釈プラットフォーム"
    >
      {/* Main logo symbol: Musical timeline flow */}
      <g transform="translate(4, 8)">
        {/* Primary wave - flowing rhythm */}
        <path d="M2 18 Q8 14 14 18 Q20 22 26 18 Q32 14 38 18 Q44 22 50 18" 
              stroke="url(#primaryGradient)" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              fill="none"
              opacity="0.9"/>
        
        {/* Secondary wave - harmonic layer */}
        <path d="M4 26 Q12 20 20 26 Q28 32 36 26 Q44 20 52 26" 
              stroke="url(#secondaryGradient)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              fill="none"
              opacity="0.8"/>
        
        {/* Accent wave - bass foundation */}
        <path d="M6 34 Q16 28 26 34 Q36 40 46 34 Q56 28 66 34" 
              stroke="url(#accentGradient)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              fill="none"
              opacity="0.7"/>
        
        {/* Connection nodes - song transitions */}
        <g>
          {/* Song 1 node */}
          <circle cx="14" cy="18" r="3" fill="url(#primaryGradient)" opacity="0.9">
            <animate attributeName="r" values="3;3.5;3" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          {/* Song 2 node */}
          <circle cx="28" cy="26" r="2.5" fill="url(#secondaryGradient)" opacity="0.8">
            <animate attributeName="r" values="2.5;3;2.5" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          
          {/* Song 3 node */}
          <circle cx="42" cy="34" r="2" fill="url(#accentGradient)" opacity="0.7">
            <animate attributeName="r" values="2;2.5;2" dur="2.4s" repeatCount="indefinite"/>
          </circle>
        </g>
        
        {/* Flow connectors - medley continuity */}
        <g opacity="0.3">
          <path d="M14 21 Q21 28 28 23" 
                stroke="url(#connectGradient)" 
                strokeWidth="1.5" 
                strokeDasharray="2,2"/>
          <path d="M28 29 Q35 36 42 31" 
                stroke="url(#connectGradient)" 
                strokeWidth="1.5" 
                strokeDasharray="2,2"/>
        </g>
      </g>
      
      {/* Medlean text */}
      {showText && (
        <text x="74" y="38"
              fontFamily="var(--font-display), serif"
              fontSize={fontSize}
              fontWeight="700"
              letterSpacing="-0.02em"
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
        
        <linearGradient id="connectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#ff8c42'}}/>
          <stop offset="50%" style={{stopColor:'#5b6dee'}}/>
          <stop offset="100%" style={{stopColor:'#00d9a3'}}/>
        </linearGradient>
        
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#ff8c42'}}/>
          <stop offset="35%" style={{stopColor:'#5b6dee'}}/>
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