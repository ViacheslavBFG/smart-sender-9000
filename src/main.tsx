import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { resetTransportState } from './api/client';
import { router } from './App';
import { queryClient } from './query/client';
import { setSessionExpiredHandler } from './session/store';
import './index.css';

setSessionExpiredHandler(() => {
  resetTransportState();
  queryClient.removeQueries();
});

async function start(): Promise<void> {
  if (import.meta.env.MODE !== 'test') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledFrame: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element is missing');

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
