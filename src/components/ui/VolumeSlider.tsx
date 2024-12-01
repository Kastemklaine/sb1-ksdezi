import React from 'react';
import { Volume2 } from 'lucide-react';
import { Slider } from './Slider';

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Volume2 className="w-4 h-4 text-gray-400" />
      <Slider
        value={value}
        min={0}
        max={1}
        step={0.01}
        onChange={onChange}
      />
    </div>
  );
};