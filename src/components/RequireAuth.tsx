import { Outlet } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { useAuthenticated } from '../session/store';

export function RequireAuth() {
  const authenticated = useAuthenticated();
  if (!authenticated) return <LoginPage />;
  return <Outlet />;
}
