import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import type { ComponentProps, MouseEvent } from 'react';
import { Link } from 'react-router-dom';

const MotionLink = motion.create(Link);

const press = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
};

type Tone = 'ghost' | 'primary';

function classNameFor(tone: Tone, className?: string): string {
  return ['button', tone === 'primary' ? 'button-primary' : 'button-ghost', className]
    .filter(Boolean)
    .join(' ');
}

function useMagnetic(disabled: boolean) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    if (disabled || reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const pull = Math.min(10, distance * 0.18);
    x.set((dx / distance) * pull);
    y.set((dy / distance) * pull - 2);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { x: springX, y: springY, onMouseMove, onMouseLeave };
}

type ButtonProps = ComponentProps<typeof motion.button> & {
  tone?: Tone;
  magnetic?: boolean;
};

export function Button({
  tone = 'ghost',
  className,
  disabled,
  type = 'button',
  magnetic = true,
  style,
  onMouseMove,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const pull = useMagnetic(Boolean(disabled) || !magnetic);

  return (
    <motion.button
      {...props}
      type={type}
      className={classNameFor(tone, className)}
      disabled={disabled}
      style={magnetic ? { ...style, x: pull.x, y: pull.y } : style}
      whileHover={disabled ? undefined : press.whileHover}
      whileTap={disabled ? undefined : press.whileTap}
      transition={press.transition}
      onMouseMove={(event) => {
        pull.onMouseMove(event);
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        pull.onMouseLeave();
        onMouseLeave?.(event);
      }}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof MotionLink> & {
  tone?: Tone;
};

export function ButtonLink({
  tone = 'ghost',
  className,
  style,
  onMouseMove,
  onMouseLeave,
  ...props
}: ButtonLinkProps) {
  const magnetic = useMagnetic(false);

  return (
    <MotionLink
      {...props}
      className={classNameFor(tone, className)}
      style={{ ...style, x: magnetic.x, y: magnetic.y }}
      whileHover={press.whileHover}
      whileTap={press.whileTap}
      transition={press.transition}
      onMouseMove={(event) => {
        magnetic.onMouseMove(event);
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        magnetic.onMouseLeave();
        onMouseLeave?.(event);
      }}
    />
  );
}
