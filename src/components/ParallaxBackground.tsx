import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect } from 'react';

export function ParallaxBackground() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 40, damping: 18 });
  const springY = useSpring(y, { stiffness: 40, damping: 18 });

  useEffect(() => {
    if (reduce) return undefined;
    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 36;
      const ny = (event.clientY / window.innerHeight - 0.5) * 24;
      x.set(nx);
      y.set(ny);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, x, y]);

  return <motion.div aria-hidden='true' className='parallax-bg' style={{ x: springX, y: springY }} />;
}
