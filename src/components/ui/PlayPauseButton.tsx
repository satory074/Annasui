"use client";

interface PlayPauseButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PlayPauseButton({
  isPlaying,
  onClick,
  size = "md",
  className = "",
}: PlayPauseButtonProps) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <button
      onClick={onClick}
      className={`text-white rounded-full transition-all hover:shadow-lg ${sizeClasses[size]} ${className}`}
      style={{ background: 'var(--gradient-primary)' }}
    >
      {isPlaying ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconSizeClasses[size]}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconSizeClasses[size]}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}