import { useCallback } from 'react';
import * as Tone from 'tone';
import { Track, TrackEffect } from '../types/track';

export const useEffects = () => {
  const applyEffect = useCallback((track: Track, effect: TrackEffect) => {
    let toneEffect;

    switch (effect.type) {
      case 'reverb':
        toneEffect = new Tone.Reverb({
          decay: effect.parameters.decay,
          wet: effect.parameters.mix,
        });
        break;
      case 'compression':
        toneEffect = new Tone.Compressor({
          threshold: effect.parameters.threshold,
          ratio: effect.parameters.ratio,
        });
        break;
      case 'eq':
        toneEffect = new Tone.EQ3({
          low: effect.parameters.low,
          mid: effect.parameters.mid,
          high: effect.parameters.high,
        });
        break;
    }

    return toneEffect;
  }, []);

  const updateEffect = useCallback((
    effect: Tone.ToneAudioNode,
    parameter: string,
    value: number
  ) => {
    if (effect && effect.hasOwnProperty(parameter)) {
      (effect as any)[parameter] = value;
    }
  }, []);

  return { applyEffect, updateEffect };
};