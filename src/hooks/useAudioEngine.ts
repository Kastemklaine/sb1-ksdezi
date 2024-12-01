import { useState, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../services/audio/AudioRecorder';

export function useAudioEngine() {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder] = useState(() => new AudioRecorder());

  useEffect(() => {
    recorder.initialize();
    return () => recorder.dispose();
  }, []);

  const startRecording = useCallback(async () => {
    const success = await recorder.startRecording();
    if (success) {
      setIsRecording(true);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    const filePath = await recorder.stopRecording();
    setIsRecording(false);
    return filePath;
  }, [recorder]);

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}