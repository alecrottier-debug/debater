"use client";

import { useState, useRef, useCallback } from "react";
import { fetchTtsAudio } from "@/lib/api";

export function useAudio() {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlaying(false);
  }, []);

  const playTurn = useCallback(
    async (text: string, speaker: string) => {
      stop();
      try {
        const blob = await fetchTtsAudio(text, speaker);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlaying(true);
        audio.onended = () => {
          setPlaying(false);
          URL.revokeObjectURL(url);
          urlRef.current = null;
          audioRef.current = null;
        };
        await audio.play();
      } catch {
        setPlaying(false);
      }
    },
    [stop],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        // Turning mute ON — stop current audio
        stop();
      }
      return !prev;
    });
  }, [stop]);

  return { muted, playing, playTurn, toggleMute, stop };
}
