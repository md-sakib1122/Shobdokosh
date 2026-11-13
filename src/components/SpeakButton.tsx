import { useEffect, useRef } from "react";
import { speak } from "../lib/speech";

interface Props {
  word: string;
  audioUrl: string | null;
  autoPlay?: boolean; // plays once on mount (Listen mode)
  size?: "md" | "lg";
  className?: string;
}

export default function SpeakButton({ word, audioUrl, autoPlay = false, size = "md", className = "" }: Props) {
  const played = useRef(false);
  useEffect(() => {
    if (autoPlay && !played.current) {
      played.current = true;
      void speak(word, audioUrl);
    }
  }, [autoPlay, word, audioUrl]);

  const dims = size === "lg" ? "h-16 w-16 text-3xl" : "h-11 w-11 text-xl";
  return (
    <button
      type="button"
      className={`btn shrink-0 rounded-full border border-teal-200 bg-teal-50 px-0 text-teal-800 hover:bg-teal-100 ${dims} ${className}`}
      onClick={() => void speak(word, audioUrl)}
      aria-label="Play pronunciation"
      title="Play pronunciation"
    >
      <span aria-hidden>🔊</span>
    </button>
  );
}
