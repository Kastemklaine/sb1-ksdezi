import { useState, useCallback } from 'react';
import { Audio } from '@nativescript/audio';

export function useAudio() {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder] = useState(new Audio.Recorder());

  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissions();
      await recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording failed:', error);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Stop recording failed:', error);
    }
  }, [recorder]);

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}