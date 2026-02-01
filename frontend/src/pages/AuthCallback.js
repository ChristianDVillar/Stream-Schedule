import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginBackendWithSupabaseToken } from '../api';

export default function AuthCallback({ setUser, setToken }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // 1) Supabase OAuth callback: tokens in hash (#access_token=...)
      const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        try {
          const res = await loginBackendWithSupabaseToken(accessToken);
          const { token, user } = res.data;
          setToken(token);
          setUser(user);
          localStorage.setItem('auth_token', token);
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          navigate('/dashboard');
        } catch (error) {
          console.error('Google login backend error:', error);
          navigate('/login?error=oauth_failed');
        }
        return;
      }

      // 2) Backend Passport OAuth callback: token and user in query (?token=...&user=...)
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');

      if (token && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          setToken(token);
          setUser(user);
          localStorage.setItem('auth_token', token);
          navigate('/dashboard');
        } catch (error) {
          console.error('Error parsing user data:', error);
          navigate('/login?error=oauth_failed');
        }
        return;
      }

      const error = searchParams.get('error');
      if (error) {
        navigate(`/login?error=${error}`);
      } else {
        navigate('/login');
      }
    };

    run();
  }, [searchParams, setUser, setToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}
