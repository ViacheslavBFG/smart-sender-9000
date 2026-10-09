import { useMutation, useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { getMe, logout } from '../api/auth';
import { Button } from './Button';


export function AppShell() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
  });

  return (
    <div className='app'>
      <header className='topbar'>
        <div className='brand'>
          <span className='mark' aria-hidden='true' />
          <div>
            <p className='eyebrow'>Smart Sender 9000</p>
            <strong>Вебхуки</strong>
          </div>
        </div>
        <div className='session'>
          <div className='who'>
            <strong>{me.data?.name ?? '…'}</strong>
            <span>{me.data?.email ?? ''}</span>
          </div>
          <Button
            type='button'
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            Вийти
          </Button>
        </div>
      </header>
      <main className='content'>
        <Outlet />
      </main>
    </div>
  );
}
