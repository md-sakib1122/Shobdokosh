import { useEffect, useRef } from "react";
import { speak } from "../lib/speech";
import { IconSpeaker } from "./Icons";

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

  const big = size === "lg";
  return (
    <button
      type="button"
      className={`btn-icon ${big ? "h-14 w-14 border border-border-interactive" : ""} ${className}`}
      onClick={() => void speak(word, audioUrl)}
      aria-label="Hear pronunciation"
      title="Hear pronunciation"
    >
      <IconSpeaker className={big ? "h-7 w-7" : "h-5 w-5"} />
    </button>
  );
}
