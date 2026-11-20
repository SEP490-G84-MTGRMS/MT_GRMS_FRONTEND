import { useEffect, useState, type FC } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './app/router';
import { useAuthStore } from './stores/useAuthStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: FC = () => {
  const [sessionError, setSessionError] = useState<string | null>(null);
  useEffect(() => {
    const handleFailure = (event: Event) => setSessionError((event as CustomEvent<{ message: string }>).detail.message);
    const handleSuccess = () => setSessionError(null);
    window.addEventListener('session-refresh-failed', handleFailure);
    window.addEventListener('session-refreshed', handleSuccess);
    // Tự động kiểm tra và đồng bộ trạng thái đăng nhập từ HttpOnly Cookie khi tải ứng dụng
    useAuthStore.getState().checkAuth();
    return () => {
      window.removeEventListener('session-refresh-failed', handleFailure);
      window.removeEventListener('session-refreshed', handleSuccess);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {sessionError && (
        <div role="alert" className="fixed bottom-5 right-5 z-[2000] flex max-w-lg flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
          <span>{sessionError}</span>
          <button type="button" className="rounded-full bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800" onClick={() => { void useAuthStore.getState().checkAuth(); }}>Thử lại</button>
          <button type="button" className="rounded-full border border-slate-300 px-4 py-2 hover:bg-slate-50" onClick={() => setSessionError(null)}>Đóng</button>
        </div>
      )}
    </QueryClientProvider>
  );
};

export default App;
