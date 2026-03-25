import React, { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

interface ChimePlayerInnerProps {
  onReady: (player: { play: () => void }) => void;
}

// Inner component calls useAudioPlayer unconditionally at top level (Rules of Hooks).
// Wrapped in an ErrorBoundary in ChimePlayer so a missing asset fails silently.
function ChimePlayerInner({ onReady }: ChimePlayerInnerProps) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const player = useAudioPlayer(require('../assets/sounds/chime.mp3'));

  useEffect(() => {
    onReady(player);
    // onReady is a stable ref callback — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

interface State { hasError: boolean }

// Minimal class-based error boundary — catches missing asset errors silently
class ChimeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.log('🎁 [ChimePlayer] Audio asset unavailable, skipping chime:', error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface ChimePlayerProps {
  onReady: (player: { play: () => void } | null) => void;
}

export default function ChimePlayer({ onReady }: ChimePlayerProps) {
  return (
    <ChimeErrorBoundary>
      <ChimePlayerInner onReady={onReady} />
    </ChimeErrorBoundary>
  );
}
