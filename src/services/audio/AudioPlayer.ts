import { Audio } from '@nativescript/audio';
import { AudioConfig } from './types';

export class AudioPlayer {
  private player: Audio.Player;

  constructor() {
    this.player = new Audio.Player();
  }

  async initialize(config: AudioConfig = {}): Promise<boolean> {
    try {
      await this.player.init({
        audioFile: config.audioFile,
        loop: config.loop || false,
        completeCallback: config.onComplete,
        errorCallback: config.onError
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
      return false;
    }
  }

  async play(): Promise<boolean> {
    try {
      await this.player.play();
      return true;
    } catch (error) {
      console.error('Failed to play audio:', error);
      return false;
    }
  }

  async pause(): Promise<boolean> {
    try {
      await this.player.pause();
      return true;
    } catch (error) {
      console.error('Failed to pause audio:', error);
      return false;
    }
  }

  async stop(): Promise<boolean> {
    try {
      await this.player.dispose();
      return true;
    } catch (error) {
      console.error('Failed to stop audio:', error);
      return false;
    }
  }

  dispose(): void {
    this.player.dispose();
  }
}