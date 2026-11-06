import { useState, useEffect, useCallback } from 'react';
import { audioService } from '../services/audioService';

/**
 * Hook useAudioGuidance
 * Penghubung komponen React ke layanan audio terpusat audioService.
 */
export function useAudioGuidance() {
  const [isPlaying, setIsPlaying] = useState(audioService.isSpeaking);
  const [isMuted, setIsMuted] = useState(audioService.isMuted);

  useEffect(() => {
    audioService.onSpeakingStateChange = (speaking) => {
      setIsPlaying(speaking);
    };

    return () => {
      audioService.onSpeakingStateChange = null;
    };
  }, []);

  const speakText = useCallback((text, options) => {
    audioService.speak(text, options);
  }, []);

  const stopSpeech = useCallback(() => {
    audioService.stop();
  }, []);

  const repeatLastSpeech = useCallback(() => {
    audioService.repeatLast();
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !audioService.isMuted;
    audioService.setMuted(nextMuted);
    setIsMuted(nextMuted);
  }, []);

  const setMuted = useCallback((muted) => {
    audioService.setMuted(muted);
    setIsMuted(Boolean(muted));
  }, []);

  const setSpeechRate = useCallback((rate) => {
    audioService.setSpeechRate(rate);
  }, []);

  const playSuccessSound = useCallback(() => {
    audioService.playSuccessSound();
  }, []);

  const playErrorSound = useCallback(() => {
    audioService.playErrorSound();
  }, []);

  const playTickSound = useCallback((freq) => {
    audioService.playTickSound(freq);
  }, []);

  const playRadarPulse = useCallback((freq, vol) => {
    audioService.playRadarPulse(freq, vol);
  }, []);

  return {
    isPlaying,
    isMuted,
    speakText,
    stopSpeech,
    repeatLastSpeech,
    toggleMute,
    setMuted,
    setSpeechRate,
    playSuccessSound,
    playErrorSound,
    playTickSound,
    playRadarPulse,
  };
}
