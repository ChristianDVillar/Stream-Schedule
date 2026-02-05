import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  loginBackendWithSupabaseToken,
  linkGoogleWithSupabaseToken,
  linkTwitchWithSupabaseToken,
  getOAuthLinkMode,
  clearOAuthLinkMode,
} from '../api';

export default function AuthCallback({ setAuth }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // Prevent navigation issues by cleaning up URL immediately
      const currentUrl = window.location.href;
      console.log('AuthCallback: Processing callback', { 
        hash: window.location.hash?.substring(0, 50),
        search: window.location.search?.substring(0, 50),
        pathname: window.location.pathname
      });

      // 1) Supabase OAuth callback: tokens in hash (#access_token=...)
      const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
      const accessToken = hashParams.get('access_token');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // Handle OAuth errors from Supabase
      if (errorParam && !accessToken) {
        console.error('OAuth error in hash', { error: errorParam, description: errorDescription });
        const errorMsg = errorDescription || errorParam || 'OAuth authentication failed';
        window.alert(errorMsg);
        navigate('/login?error=oauth_failed');
        return;
      }

      if (accessToken) {
        const linkMode = getOAuthLinkMode();
        if (linkMode === 'google') {
          try {
            await linkGoogleWithSupabaseToken(accessToken);
            clearOAuthLinkMode();
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            navigate('/settings?linked=google');
          } catch (error) {
            console.error('Link Google error:', error);
            clearOAuthLinkMode();
            const msg = error?.response?.data?.error || error?.message || 'Failed to link Google';
            window.alert(msg);
            navigate('/settings?error=link_google_failed');
          }
          return;
        }
        if (linkMode === 'twitch') {
          try {
            await linkTwitchWithSupabaseToken(accessToken);
            clearOAuthLinkMode();
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            navigate('/settings?linked=twitch');
          } catch (error) {
            console.error('Link Twitch error:', error);
            clearOAuthLinkMode();
            const msg = error?.response?.data?.error || error?.message || 'Failed to link Twitch';
            window.alert(msg);
            navigate('/settings?error=link_twitch_failed');
          }
          return;
        }
        try {
          const res = await loginBackendWithSupabaseToken(accessToken);
          const { token, user } = res.data;
          setAuth(user, token);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          navigate('/dashboard');
        } catch (error) {
          console.error('OAuth login backend error:', error);
          const msg = error?.message || error?.response?.data?.error || 'OAuth login failed';
          window.alert(msg);
          navigate('/login?error=oauth_failed');
        }
        return;
      }

      // 2) Backend Passport OAuth callback: token and user in query (?token=...&user=...&returnTo=discord)
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');
      const returnTo = searchParams.get('returnTo');
      const error = searchParams.get('error');
      const reason = searchParams.get('reason');

      if (error && !token) {
        console.error('OAuth error in query params', { error, reason });
        const errorMsg = reason || error || 'OAuth authentication failed';
        window.alert(errorMsg);
        navigate(`/login?error=${error}`);
        return;
      }

      if (token && userParam) {
        try {
          console.log('Processing Passport OAuth callback', { hasToken: !!token, hasUser: !!userParam });
          const user = JSON.parse(decodeURIComponent(userParam));
          setAuth(user, token);
          
          // Clean URL before navigation to prevent Chrome navigation issues
          window.history.replaceState(null, '', window.location.pathname);
          
          // Use setTimeout to ensure state is set before navigation
          setTimeout(() => {
            navigate(returnTo === 'discord' ? '/schedule' : '/dashboard', { replace: true });
          }, 100);
        } catch (error) {
          console.error('Error parsing user data:', error);
          window.alert('Error processing authentication data. Please try again.');
          navigate('/login?error=oauth_failed', { replace: true });
        }
        return;
      }

      // No token or access token found
      console.warn('AuthCallback: No authentication data found', { 
        hasAccessToken: !!accessToken,
        hasToken: !!token,
        hasUserParam: !!userParam,
        error
      });
      
      if (error) {
        navigate(`/login?error=${error}`, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };

    run();
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
}
