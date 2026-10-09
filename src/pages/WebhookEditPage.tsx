import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, fieldError, isApiError } from '../api/errors';
import type { Webhook } from '../api/types';
import { getWebhook, updateWebhook } from '../api/webhooks';
import { Button, ButtonLink } from '../components/Button';
import { Field } from '../components/Field';

export function WebhookEditPage() {
  const { id } = useParams();
  const listSearch = useListSearch();
  const query = useQuery({
    queryKey: ['webhook', id],
    queryFn: () => getWebhook(id ?? ''),
    enabled: Boolean(id),
  });

  useEffect(() => {
    document.title = 'Редагування вебхука — Smart Sender 9000';
  }, []);

  if (!id) {
    return (
      <section className='stack'>
        <BackLink listSearch={listSearch} />
        <p className='empty'>Вебхук не знайдено.</p>
      </section>
    );
  }

  if (query.isPending) return <p className='status-line'>Завантаження…</p>;

  if (query.isError) {
    const missing = isApiError(query.error) && query.error.status === 404;
    return (
      <section className='stack'>
        <BackLink listSearch={listSearch} />
        <div className='banner' role='alert'>
          <p>{missing ? 'Вебхук не знайдено.' : errorMessage(query.error)}</p>
          {missing ? null : (
            <Button type='button' onClick={() => query.refetch()}>
              Спробувати ще раз
            </Button>
          )}
        </div>
      </section>
    );
  }

  return <EditForm webhook={query.data} listSearch={listSearch} />;
}

function EditForm({ webhook, listSearch }: { webhook: Webhook; listSearch: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backTo = `/webhooks${listSearch}`;
  const [name, setName] = useState(webhook.name);
  const [url, setUrl] = useState(webhook.url);
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (input: { name: string; url: string }) => updateWebhook(webhook.id, input),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      await queryClient.invalidateQueries({ queryKey: ['webhook', webhook.id] });
      await new Promise((resolve) => window.setTimeout(resolve, 720));
      navigate(backTo);
    },
  });

  const nameError = fieldError(mutation.error, 'name');
  const urlError = fieldError(mutation.error, 'url');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ name, url });
  }

  return (
    <section className='stack'>
      <BackLink listSearch={listSearch} />
      <motion.div
        className='card form-card'
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <p className='eyebrow'>Редагування вебхука</p>
        <motion.h1 className='webhook-name' layoutId={`webhook-name-${webhook.id}`}>
          {webhook.name}
        </motion.h1>
        <p className='lede'>
          {webhook.active ? 'Активний' : 'Вимкнений'} · створено {webhook.created_at.slice(0, 10)}
        </p>
        <form onSubmit={onSubmit} noValidate>
          {mutation.isError ? (
            <p className='banner' role='alert'>
              {errorMessage(mutation.error)}
            </p>
          ) : null}
          <Field id='name' label='Назва' error={nameError}>
            <input
              id='name'
              value={name}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'name-error' : undefined}
              onChange={(event) => {
                setName(event.target.value);
                mutation.reset();
              }}
            />
          </Field>
          <Field id='url' label='URL' error={urlError}>
            <input
              id='url'
              value={url}
              inputMode='url'
              spellCheck={false}
              aria-invalid={urlError ? true : undefined}
              aria-describedby={urlError ? 'url-error' : undefined}
              onChange={(event) => {
                setUrl(event.target.value);
                mutation.reset();
              }}
            />
          </Field>
          <div className='form-actions'>
            <Button
              type='submit'
              tone='primary'
              className='save-button'
              disabled={mutation.isPending || saved}
            >
              {saved ? <SavedMark /> : mutation.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
            <ButtonLink to={backTo}>Скасувати</ButtonLink>
          </div>
        </form>
      </motion.div>
    </section>
  );
}

function SavedMark() {
  return (
    <svg className='saved-mark' viewBox='0 0 24 24' aria-hidden='true'>
      <motion.path
        d='M5 12.5 10 17.5 19 7'
        fill='none'
        stroke='currentColor'
        strokeWidth='2.4'
        strokeLinecap='round'
        strokeLinejoin='round'
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
    </svg>
  );
}

function BackLink({ listSearch }: { listSearch: string }) {
  return (
    <ButtonLink className='back' to={`/webhooks${listSearch}`}>
      До списку
    </ButtonLink>
  );
}

function useListSearch(): string {
  const state: unknown = useLocation().state;
  if (!state || typeof state !== 'object' || !('listSearch' in state)) return '';
  const value = state.listSearch;
  return typeof value === 'string' ? value : '';
}
