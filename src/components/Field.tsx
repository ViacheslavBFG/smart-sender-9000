import { AnimatePresence, motion, useAnimation } from 'motion/react';
import { type ReactNode, useEffect } from 'react';

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

export function Field({ id, label, error, children }: FieldProps) {
  const shake = useAnimation();

  useEffect(() => {
    if (!error) return;
    void shake.start({
      x: [0, -7, 7, -4, 4, 0],
      transition: { duration: 0.42 },
    });
  }, [error, shake]);

  return (
    <motion.div className='field' animate={shake}>
      <label htmlFor={id}>{label}</label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={`${id}-error`}
            className='field-error'
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
