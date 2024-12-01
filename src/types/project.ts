import { Track } from './track';

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}