import { Audio } from '@nativescript/audio';

export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const result = await Audio.requestPermissions();
    return result;
  } catch (error) {
    console.error('Failed to request audio permissions:', error);
    return false;
  }
}

export function createAudioPlayer() {
  return new Audio.Player();
}

export function createAudioRecorder() {
  return new Audio.Recorder();
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}