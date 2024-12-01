import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Slider } from './Slider';

interface PanSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const PanSlider: React.FC<PanSliderProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <ArrowLeftRight className="w-4 h-4 text-gray-400" />
      <Slider
        value={value}
        min={-1}
        max={1}
        step={0.01}
        onChange={onChange}
      />
      <span className="text-xs text-gray-400">
        {value < 0 ? 'L' : value > 0 ? 'R' : 'C'}
      </span>
    </div>
  );
};