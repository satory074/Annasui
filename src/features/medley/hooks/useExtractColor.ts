import { useState, useCallback, useRef, useEffect } from "react";

interface Links {
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}

interface UseExtractColorReturn {
  extractColor: (links: Links) => Promise<string | null>;
  isExtracting: boolean;
}

export function useExtractColor(): UseExtractColorReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const extractColor = useCallback(
    async (links: Links): Promise<string | null> => {
      // Nothing to extract from
      if (!links.niconicoLink && !links.youtubeLink && !links.spotifyLink) {
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsExtracting(true);
      try {
        const res = await fetch("/api/color/extract/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            niconicoLink: links.niconicoLink,
            youtubeLink: links.youtubeLink,
            spotifyLink: links.spotifyLink,
          }),
          signal: controller.signal,
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.color ?? null;
      } catch {
        return null;
      } finally {
        if (abortRef.current === controller) {
          setIsExtracting(false);
        }
      }
    },
    []
  );

  return { extractColor, isExtracting };
}
