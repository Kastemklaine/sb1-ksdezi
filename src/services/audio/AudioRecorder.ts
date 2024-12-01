import { Audio } from '@nativescript/audio';
import { requestPermissions } from '../permissions/PermissionService';

export class AudioRecorder {
  private recorder: Audio.Recorder;

  constructor() {
    this.recorder = new Audio.Recorder();
  }

  async initialize(): Promise<boolean> {
    try {
      const hasPermissions = await requestPermissions(['microphone']);
      return hasPermissions;
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      await this.recorder.start();
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      const filePath = await this.recorder.stop();
      return filePath;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }

  dispose(): void {
    this.recorder.dispose();
  }
}