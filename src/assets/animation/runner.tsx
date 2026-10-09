import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { motion, useAnimationFrame, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  consumeSessionEndReason,
  getAuthenticated,
  subscribe,
} from '../../session/store';

type Mood = 'run' | 'busy' | 'error' | 'surprised';

export function RunningFace() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching();
  const queryError = useSyncExternalStore(
    (listener) => queryClient.getQueryCache().subscribe(listener),
    () => queryClient.getQueryCache().getAll().some((query) => query.state.status === 'error'),
    () => false,
  );
  const [surprised, setSurprised] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const progress = useRef(0);

  useEffect(() => {
    let timer = 0;
    const stop = subscribe(() => {
      const authenticated = getAuthenticated();
      if (authenticated) return;
      if (consumeSessionEndReason() !== 'expired') return;
      setSurprised(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSurprised(false), 1200);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, []);

  const mood: Mood = surprised ? 'surprised' : queryError ? 'error' : fetching > 0 ? 'busy' : 'run';
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useAnimationFrame((_time, delta) => {
    const current = moodRef.current;
    const speed = current === 'busy' ? 2.5 : current === 'error' || current === 'surprised' ? 0 : 1;
    if (speed === 0) return;
    const width = Math.max(0, window.innerWidth - 72);
    const height = Math.max(0, window.innerHeight - 72);
    const step = Math.min(delta, 50);
    progress.current = (progress.current + (step / 30000) * speed) % 1;
    const point = pointOnLap(progress.current, width, height);
    x.set(point.x);
    y.set(point.y);
  });

  const face = mood === 'surprised' ? '😮' : mood === 'error' ? '😣' : '😀';

  return (
    <motion.div
      aria-hidden='true'
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 9999,
        pointerEvents: 'none',
        x,
        y,
      }}
    >
      <motion.div
        style={{ fontSize: 48, lineHeight: 1, display: 'inline-block' }}
        animate={faceMotion(mood)}
        transition={faceTransition(mood)}
      >
        {face}
      </motion.div>
    </motion.div>
  );
}

function pointOnLap(progress: number, width: number, height: number): { x: number; y: number } {
  if (progress < 0.25) return { x: (progress / 0.25) * width, y: 0 };
  if (progress < 0.5) return { x: width, y: ((progress - 0.25) / 0.25) * height };
  if (progress < 0.75) return { x: width - ((progress - 0.5) / 0.25) * width, y: height };
  return { x: 0, y: height - ((progress - 0.75) / 0.25) * height };
}

function faceMotion(mood: Mood) {
  if (mood === 'error') return { rotate: [0, -16, 14, -10, 8, 0], y: 0, scale: 1 };
  if (mood === 'surprised') return { rotate: 0, y: 0, scale: [1, 1.18, 1] };
  return { y: [0, -6, 0], scaleX: [1, 1.05, 1], rotate: 0, scale: 1 };
}

function faceTransition(mood: Mood) {
  if (mood === 'error') return { duration: 0.55, repeat: Infinity, repeatDelay: 0.35 };
  if (mood === 'surprised') return { duration: 0.45 };
  return { duration: mood === 'busy' ? 0.18 : 0.35, repeat: Infinity, ease: 'easeInOut' as const };
}
