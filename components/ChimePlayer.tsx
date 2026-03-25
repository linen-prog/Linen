import React from 'react';

// ChimePlayer: plays a gentle chime when mounted.
// To enable: place a chime.mp3 file in assets/sounds/ and uncomment the audio code below.
interface ChimePlayerProps {
  onReady?: (player: unknown) => void;
}

export default function ChimePlayer({ onReady }: ChimePlayerProps) {
  // Audio disabled until assets/sounds/chime.mp3 is provided.
  return null;
}
