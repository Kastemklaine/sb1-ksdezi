import { useState, useCallback } from 'react';
import { AudioRecorder } from '../services/audio/AudioRecorder';
import { NotificationService } from '../services/notifications/NotificationService';
import { generateRecordingFileName, ensureRecordingsFolderExists } from '../utils/file';

export function useRecordingManager() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);
  const recorder = new AudioRecorder();

  const startRecording = useCallback(async () => {
    try {
      await ensureRecordingsFolderExists();
      const fileName = generateRecordingFileName();
      
      const success = await recorder.startRecording();
      if (success) {
        setIsRecording(true);
        setCurrentRecording(fileName);
        
        await NotificationService.showRecordingNotification({
          id: 1,
          title: 'Recording in Progress',
          body: 'Tap to return to SingrdBeats'
        });
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const filePath = await recorder.stopRecording();
      setIsRecording(false);
      setCurrentRecording(null);
      await NotificationService.cancelNotification(1);
      return filePath;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }, []);

  return {
    isRecording,
    currentRecording,
    startRecording,
    stopRecording
  };
}