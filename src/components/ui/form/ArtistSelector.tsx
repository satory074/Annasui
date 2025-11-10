"use client";

import { useState, useEffect } from "react";
import { fetchAllArtists } from "@/lib/utils/songDatabase";
import { logger } from "@/lib/utils/logger";

interface Artist {
  id: string;
  name: string;
}

interface ArtistSelectorProps {
  selectedArtists: Artist[];
  onChange: (artists: Artist[]) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

export default function ArtistSelector({
  selectedArtists,
  onChange,
  label,
  placeholder = "入力して選択または新規追加",
  className = ""
}: ArtistSelectorProps) {
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load all artists on mount
  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    setIsLoading(true);
    try {
      const artists = await fetchAllArtists();
      setAllArtists(artists);
    } catch (error) {
      logger.error("Failed to fetch artists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddArtist = (artistName: string) => {
    const trimmedName = artistName.trim();
    if (!trimmedName) return;

    // Check if already selected
    if (selectedArtists.some(a => a.name.toLowerCase() === trimmedName.toLowerCase())) {
      setInputValue("");
      return;
    }

    // Check if exists in database
    const existingArtist = allArtists.find(
      a => a.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingArtist) {
      // Add existing artist
      onChange([...selectedArtists, existingArtist]);
      setInputValue("");
    } else {
      // Add new artist with temporary ID (will be created on save)
      const newArtist: Artist = {
        id: `temp-${Date.now()}`,
        name: trimmedName
      };
      onChange([...selectedArtists, newArtist]);
      setInputValue("");

      // Refresh artist list to include the new one when it's created
      loadArtists();
    }
  };

  const handleRemoveArtist = (artistId: string) => {
    onChange(selectedArtists.filter(a => a.id !== artistId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddArtist(inputValue);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      {/* Selected artists as chips */}
      {selectedArtists.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedArtists.map((artist) => (
            <div
              key={artist.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
            >
              <span>{artist.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveArtist(artist.id)}
                className="ml-1 hover:text-orange-600 focus:outline-none"
                aria-label={`${artist.name}を削除`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input with datalist */}
      <div className="relative">
        <input
          type="text"
          list="artist-suggestions"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
          placeholder={placeholder}
          disabled={isLoading}
        />

        <datalist id="artist-suggestions">
          {allArtists
            .filter(artist =>
              !selectedArtists.some(s => s.id === artist.id) &&
              artist.name.toLowerCase().includes(inputValue.toLowerCase())
            )
            .map((artist) => (
              <option key={artist.id} value={artist.name} />
            ))}
        </datalist>

        {inputValue && (
          <button
            type="button"
            onClick={() => handleAddArtist(inputValue)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none"
          >
            追加
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {isLoading
          ? "アーティストを読み込み中..."
          : "既存のアーティストから選択するか、新しい名前を入力してください"}
      </p>
    </div>
  );
}

ArtistSelector.displayName = "ArtistSelector";
