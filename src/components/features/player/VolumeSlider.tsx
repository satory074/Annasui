"use client";

interface VolumeSliderProps {
  volume: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function VolumeSlider({ volume, onChange }: VolumeSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-white"
      >
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={onChange}
        className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />
    </div>
  );
}