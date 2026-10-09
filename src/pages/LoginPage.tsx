import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { errorMessage, fieldError } from '../api/errors';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { DEMO_USER } from '../mocks/credentials';
import { useAuthenticated } from '../session/store';

export function LoginPage() {
  const authenticated = useAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      login(input.email, input.password),
    onSuccess: () => {
      if (location.pathname === '/login')
        navigate('/webhooks', { replace: true });
    },
  });

  if (authenticated) {
    if (location.pathname === '/login')
      return <Navigate to='/webhooks' replace />;
    return null;
  }

  const emailError = fieldError(mutation.error, 'email');
  const passwordError = fieldError(mutation.error, 'password');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className='login-screen'>
      <section className='card login-card'>
        <p className='eyebrow'>Smart Sender 9000</p>
        <h1>Вхід</h1>
        <p className='lede'>Після входу відкриється список вебхуків.</p>
        <form onSubmit={onSubmit} noValidate>
          {mutation.error ? (
            <p className='banner' role='alert'>
              {errorMessage(mutation.error)}
            </p>
          ) : null}
          <Field id='email' label='Електронна пошта' error={emailError}>
            <input
              id='email'
              type='email'
              autoComplete='username'
              value={email}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field id='password' label='Пароль' error={passwordError}>
            <input
              id='password'
              type='password'
              autoComplete='current-password'
              value={password}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button type='submit' tone='primary' disabled={mutation.isPending}>
            {mutation.isPending ? 'Входимо…' : 'Увійти'}
          </Button>
        </form>
        <p className='hint'>
          <CopyLine value={DEMO_USER.email} />
          <br />
          <CopyLine value={DEMO_USER.password} />
        </p>
      </section>
    </main>
  );
}

async function writeClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const wrote = document.execCommand('copy');
    area.remove();
    return wrote;
  }
}

function CopyLine({ value }: { value: string }) {
  const [toastId, setToastId] = useState<number | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onCopy() {
    window.clearTimeout(timer.current);
    setToastId(Date.now());
    timer.current = window.setTimeout(() => setToastId(null), 1000);
    void writeClipboard(value);
  }

  return (
    <span
      className='copy-target'
      role='button'
      tabIndex={0}
      onClick={() => void onCopy()}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        void onCopy();
      }}
    >
      <code>{value}</code>
      <AnimatePresence>
        {toastId !== null ? (
          <motion.span
            key={toastId}
            className='copied-chip'
            role='status'
            initial={{ opacity: 0, scale: 0.45, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
          >
            Copied!
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
