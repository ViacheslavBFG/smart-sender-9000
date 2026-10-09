import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const HOLD_MS = 2000;

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const frame = document.getElementById('app-frame');
    if (frame) {
      if (visible) frame.setAttribute('inert', '');
      else frame.removeAttribute('inert');
    }
    return () => frame?.removeAttribute('inert');
  }, [visible]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className='preloader'
          role='status'
          aria-live='polite'
          aria-label='Завантаження Smart Sender 9000'
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: reduce ? 0.01 : 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className='preloader-stage'
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className='preloader-orbit'>
              <svg className='preloader-ring' viewBox='0 0 120 120' aria-hidden='true'>
                <circle className='preloader-track' cx='60' cy='60' r='52' />
                <motion.circle
                  className='preloader-arc'
                  cx='60'
                  cy='60'
                  r='52'
                  fill='none'
                  pathLength={1}
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 2, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <motion.span
                className='mark preloader-mark'
                initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.08 }}
              />
            </div>
            <motion.div
              className='preloader-copy'
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: reduce ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className='eyebrow'>Smart Sender 9000</p>
              <p className='preloader-status'>
                Завантаження
                <span className='preloader-dots' aria-hidden='true'>
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: dot * 0.16,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </span>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
