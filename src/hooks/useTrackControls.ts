import { useCallback } from 'react';
import { Track } from '../types/track';
import { useProjectStore } from '../store/useProjectStore';

export function useTrackControls() {
  const { updateTrack } = useProjectStore();

  const setVolume = useCallback((trackId: string, volume: number) => {
    updateTrack(trackId, { volume });
  }, [updateTrack]);

  const toggleMute = useCallback((trackId: string, track: Track) => {
    updateTrack(trackId, { muted: !track.muted });
  }, [updateTrack]);

  return {
    setVolume,
    toggleMute
  };
}