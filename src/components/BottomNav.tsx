import { NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';

const ICONS: Record<string, ReactElement> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
  ),
};

const items = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/jobs', label: 'Jobs', icon: 'jobs', end: false },
  { to: '/jobs/new', label: 'Add Call', icon: 'add', end: false, primary: true },
  { to: '/customers', label: 'Customers', icon: 'customers', end: false },
  { to: '/more', label: 'More', icon: 'more', end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                item.primary
                  ? 'text-blue-400'
                  : isActive
                    ? 'text-white'
                    : 'text-zinc-500'
              }`
            }
          >
            {item.primary ? (
              <span className="bg-blue-600 text-white rounded-full p-2 -mt-4 shadow-lg shadow-blue-900/50">
                {ICONS[item.icon]}
              </span>
            ) : (
              ICONS[item.icon]
            )}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
