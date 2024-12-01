export interface AudioConfig {
  audioFile?: string;
  loop?: boolean;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface RecordingOptions {
  filename?: string;
  format?: 'mp3' | 'm4a' | 'wav';
  quality?: 'low' | 'medium' | 'high';
}

export interface AudioMetadata {
  duration: number;
  size: number;
  format: string;
  path: string;
}