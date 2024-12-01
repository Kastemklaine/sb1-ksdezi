export interface TrackEffect {
  id: string;
  type: 'reverb' | 'compression' | 'eq';
  enabled: boolean;
  parameters: {
    [key: string]: number;
  };
}

export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi';
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  audioUrl?: string;
  effects: TrackEffect[];
}