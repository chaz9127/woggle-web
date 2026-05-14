import { useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminWordSuggestions from './AdminWordSuggestions';

const NAV = [
  { key: 'users', label: 'Users', render: () => <AdminUsers /> },
  { key: 'word-suggestions', label: 'Word Suggestions', render: () => <AdminWordSuggestions /> },
];

export default function AdminPage() {
  const [active, setActive] = useState('users');
  const current = NAV.find((n) => n.key === active) || NAV[0];

  return (
    <div className="admin">
      <aside className="admin__nav">
        <a href="/" className="admin__back">← Back to game</a>
        <h2 className="admin__heading">Admin</h2>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin__nav-item ${active === item.key ? 'admin__nav-item--active' : ''}`}
              onClick={() => setActive(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin__main">
        {current.render()}
      </main>
    </div>
  );
}
