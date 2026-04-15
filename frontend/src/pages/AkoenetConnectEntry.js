import { Navigate, useLocation } from 'react-router-dom';

export default function AkoenetConnectEntry({ user }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  const slug = (params.get('slug') || '').trim();

  const targetParams = new URLSearchParams();
  targetParams.set('tab', 'platforms');
  targetParams.set('autoconnect', 'akoenet');
  if (slug) {
    targetParams.set('slug', slug);
  }

  const target = `/settings?${targetParams.toString()}`;
  if (user) {
    return <Navigate to={target} replace />;
  }
  return <Navigate to={`/login?next=${encodeURIComponent(target)}`} replace />;
}
