import { LayoutGroup } from 'motion/react';
import { useEffect, useRef } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { RunningFace } from './assets/animation/runner';
import { AppShell } from './components/AppShell';
import { ParallaxBackground } from './components/ParallaxBackground';
import { Preloader } from './components/Preloader';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { WebhookEditPage } from './pages/WebhookEditPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { useAuthenticated } from './session/store';

function SessionWatcher() {
  const authenticated = useAuthenticated();
  const location = useLocation();
  const navigate = useNavigate();
  const previous = useRef(authenticated);

  useEffect(() => {
    const loggedOut = previous.current && !authenticated;
    previous.current = authenticated;
    if (loggedOut && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [authenticated, location.pathname, navigate]);

  return (
    <LayoutGroup>
      <Preloader />
      <div id='app-frame'>
        <ParallaxBackground />
        <RunningFace />
        <Outlet />
      </div>
    </LayoutGroup>
  );
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter([
  {
    element: <SessionWatcher />,

    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to='/webhooks' replace /> },
              { path: 'webhooks', element: <WebhooksPage /> },
              { path: 'webhooks/:id', element: <WebhookEditPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to='/' replace /> },
    ],
  },
], {
  basename: basename === '' ? undefined : basename,
});
