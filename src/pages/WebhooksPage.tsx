import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/errors';
import { listWebhooks } from '../api/webhooks';
import { Button, ButtonLink } from '../components/Button';
import { PAGE_SIZE, parsePage } from '../lib/paging';

export function WebhooksPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get('page'));
  const search = params.get('search') ?? '';
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    document.title = 'Вебхуки — Smart Sender 9000';
  }, []);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  useEffect(() => {
    if (draft === search) return undefined;
    const timeout = window.setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (draft) next.set('search', draft);
        else next.delete('search');
        next.set('page', '1');
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draft, search, setParams]);

  const query = useQuery({
    queryKey: ['webhooks', page, search],
    queryFn: () => listWebhooks({ page, search }),
    placeholderData: keepPreviousData,
  });

  function setPage(nextPage: number) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });
  }

  const list = query.data;
  const total = list?.paging.results.total ?? 0;
  const last = list?.paging.pages.last ?? 1;
  const from = list && list.data.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = from === 0 ? 0 : from + (list?.data.length ?? 0) - 1;

  return (
    <section className='stack'>
      <div className='page-head'>
        <div>
          <h1>Список вебхуків</h1>
          <p className='lede'>Пошук і сторінка зберігаються в адресі.</p>
        </div>
        <label className='search'>
          <span>Пошук за назвою</span>
          <input
            type='search'
            value={draft}
            placeholder='Наприклад, order'
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      </div>

      {query.isPending && !list ? (
        <p className='status-line'>Завантаження…</p>
      ) : null}

      {query.isError ? (
        <div className='banner' role='alert'>
          <p>Не вдалося завантажити вебхуки. {errorMessage(query.error)}</p>
          <Button type='button' onClick={() => query.refetch()}>
            Спробувати ще раз
          </Button>
        </div>
      ) : null}

      {list && total === 0 ? (
        <p className='empty'>Нічого не знайдено.</p>
      ) : null}

      {list && total > 0 && list.data.length === 0 ? (
        <div className='empty'>
          <p>На цій сторінці немає записів.</p>
          <Button type='button' onClick={() => setPage(1)}>
            До першої сторінки
          </Button>
        </div>
      ) : null}

      {list && list.data.length > 0 ? (
        <div className='table-card' aria-busy={query.isFetching}>
          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>URL</th>
                  <th>Активність</th>
                  <th />
                </tr>
              </thead>
              <AnimatePresence mode='wait'>
                <motion.tbody
                  key={list.data.map((webhook) => webhook.id).join(',')}
                  initial='hidden'
                  animate='show'
                  exit='exit'
                  variants={bodyVariants}
                >
                  {list.data.map((webhook) => (
                    <motion.tr key={webhook.id} variants={rowVariants}>
                      <td>
                        <motion.span
                          className='webhook-name'
                          layoutId={`webhook-name-${webhook.id}`}
                        >
                          {webhook.name}
                        </motion.span>
                      </td>
                      <td className='url' title={webhook.url}>
                        {webhook.url}
                      </td>
                      <td>
                        <span
                          className={
                            webhook.active ? 'pill pill-on' : 'pill pill-off'
                          }
                        >
                          {webhook.active ? 'Активний' : 'Вимкнений'}
                        </span>
                      </td>
                      <td className='actions'>
                        <ButtonLink
                          to={`/webhooks/${webhook.id}`}
                          state={{ listSearch: location.search }}
                        >
                          Редагувати
                        </ButtonLink>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
          <div className='pager'>
            <p aria-live='polite'>
              {from}–{to} з {total}
              {query.isFetching ? ' · оновлення…' : ''}
            </p>
            <div className='pager-buttons'>
              <Button
                type='button'
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </Button>
              <div className='page-pills' role='navigation' aria-label='Сторінки'>
                {pageWindow(page, last).map((number) => (
                  <Button
                    key={number}
                    type='button'
                    className='page-pill'
                    magnetic={false}
                    aria-current={number === page ? 'page' : undefined}
                    disabled={query.isFetching}
                    onClick={() => setPage(number)}
                  >
                    {number === page ? (
                      <motion.span layoutId='page-indicator' className='page-pill-bg' />
                    ) : null}
                    <span className='page-pill-label'>{number}</span>
                  </Button>
                ))}
              </div>
              <Button
                type='button'
                disabled={page >= last || query.isFetching}
                onClick={() => setPage(page + 1)}
              >
                Далі
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const bodyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
  exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

function pageWindow(page: number, last: number): number[] {
  const width = 5;
  const end = Math.min(last, Math.max(page + 2, width));
  const start = Math.max(1, end - width + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
