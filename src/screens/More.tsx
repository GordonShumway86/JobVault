import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pendingMutationCount, isOnline, onSyncStateChange } from '../lib/sync';
import TopBar from '../components/TopBar';

export default function More() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const refresh = () => pendingMutationCount().then(setPending);
    refresh();
    const unsub = onSyncStateChange(refresh);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { unsub(); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  return (
    <div>
      <TopBar title="More" />
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            <span className="text-white text-sm font-medium">{online ? 'Online' : 'Offline'}</span>
          </div>
          <div className="text-zinc-500 text-xs mt-1">
            {pending === 0 ? 'All changes synced.' : `${pending} change${pending === 1 ? '' : 's'} waiting to sync.`}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          <Link to="/settings" className="flex items-center justify-between px-4 py-3.5 text-white text-sm">
            Settings <span className="text-zinc-600">›</span>
          </Link>
          <Link to="/customers" className="flex items-center justify-between px-4 py-3.5 text-white text-sm">
            Customers <span className="text-zinc-600">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
