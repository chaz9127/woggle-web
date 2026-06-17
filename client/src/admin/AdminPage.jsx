import { useEffect, useState } from 'react';
import AdminHome from './AdminHome';
import AdminUsers from './AdminUsers';
import AdminWordSuggestions from './AdminWordSuggestions';
import AdminVisualizations from './AdminVisualizations';
import { usePageTitle } from '../hooks/usePageTitle';

export default function AdminPage() {
  const [active, setActive] = useState('home');
  const [pendingCount, setPendingCount] = useState(0);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/word-suggestions', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data) => {
        if (cancelled) return;
        const count = (data.suggestions || []).filter(
          (s) => s.status === 'pending'
        ).length;
        setPendingCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const NAV = [
    { key: 'home', label: 'Home', render: () => <AdminHome /> },
    { key: 'users', label: 'Users', render: () => <AdminUsers /> },
    {
      key: 'word-suggestions',
      label: 'Word Suggestions',
      badge: pendingCount,
      render: () => (
        <AdminWordSuggestions onPendingCountChange={setPendingCount} />
      ),
    },
    {
      key: 'visualizations',
      label: 'Visualizations',
      render: () => <AdminVisualizations />,
    },
  ];
  const current = NAV.find((n) => n.key === active) || NAV[0];

  usePageTitle(current.key === 'home' ? 'Admin' : `Admin · ${current.label}`);

  return (
    <div className={`admin ${navCollapsed ? 'admin--nav-collapsed' : ''}`}>
      <aside className="admin__nav">
        <button
          type="button"
          className="admin__nav-toggle"
          onClick={() => setNavCollapsed((c) => !c)}
          aria-label={
            navCollapsed ? 'Expand navigation' : 'Collapse navigation'
          }
          title={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {navCollapsed ? '»' : '«'}
        </button>
        {!navCollapsed && (
          <>
            <a href="/" className="admin__back">
              ← Back to game
            </a>
            <h2 className="admin__heading">Admin</h2>
          </>
        )}
        {!navCollapsed && (
          <nav className="admin__nav-list">
            {NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`admin__nav-item ${active === item.key ? 'admin__nav-item--active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                {item.badge > 0 && ` (${item.badge})`} {item.label}
              </button>
            ))}
          </nav>
        )}
      </aside>
      <main className="admin__main">{current.render()}</main>
    </div>
  );
}
