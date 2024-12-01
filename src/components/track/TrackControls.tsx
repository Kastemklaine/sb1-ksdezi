import React from 'react';
import { Mic, Music } from 'lucide-react';
import { Track } from '../../types/track';
import { VolumeSlider } from '../ui/VolumeSlider';
import { PanSlider } from '../ui/PanSlider';
import { Button } from '../ui/Button';

interface TrackControlsProps {
  track: Track;
  onUpdate: (updates: Partial<Track>) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  track,
  onUpdate,
}) => {
  return (
    <div className="flex items-center space-x-4 bg-gray-800 p-3 rounded-lg">
      <div className="flex items-center space-x-2 w-48">
        {track.type === 'audio' ? (
          <Mic className="w-5 h-5 text-purple-400" />
        ) : (
          <Music className="w-5 h-5 text-blue-400" />
        )}
        <span className="text-white font-medium truncate">{track.name}</span>
      </div>
      
      <div className="flex items-center space-x-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdate({ muted: !track.muted })}
          className={track.muted ? 'bg-red-500/20 text-red-500' : ''}
        >
          M
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUpdate({ solo: !track.solo })}
          className={track.solo ? 'bg-yellow-500/20 text-yellow-500' : ''}
        >
          S
        </Button>

        <VolumeSlider
          value={track.volume}
          onChange={(value) => onUpdate({ volume: value })}
          className="w-32"
        />

        <PanSlider
          value={track.pan}
          onChange={(value) => onUpdate({ pan: value })}
          className="w-32"
        />
      </div>
    </div>
  );
};