import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import BottomNav from './components/BottomNav';
import Dashboard from './screens/Dashboard';
import JobsList from './screens/JobsList';
import JobForm from './screens/JobForm';
import JobDetail from './screens/JobDetail';
import CustomersList from './screens/CustomersList';
import CustomerForm from './screens/CustomerForm';
import CustomerDetail from './screens/CustomerDetail';
import DispatchScan from './screens/DispatchScan';
import SiteForm from './screens/SiteForm';
import SiteDetail from './screens/SiteDetail';
import EquipmentForm from './screens/EquipmentForm';
import EquipmentDetail from './screens/EquipmentDetail';
import More from './screens/More';
import Settings from './screens/Settings';

export default function App() {
  const { session, loading, configured, error } = useAuth();

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-zinc-950 text-zinc-500">Loading…</div>;
  }

  // No login screen — the app signs itself in automatically. If that
  // fails, it's a setup problem (bad credentials/config), not something
  // to solve by typing a password, so we just say what's wrong.
  if (configured && !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-950 px-6 text-center">
        <div>
          <div className="text-white font-bold text-lg mb-2">Couldn't connect</div>
          <div className="text-zinc-400 text-sm">{error ?? 'Unknown error signing in.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 pb-24">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobsList />} />
        <Route path="/jobs/new" element={<JobForm />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/edit" element={<JobForm />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/scan" element={<DispatchScan />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/customers/:customerId/sites/new" element={<SiteForm />} />
        <Route path="/sites/:id" element={<SiteDetail />} />
        <Route path="/sites/:id/edit" element={<SiteForm />} />
        <Route path="/sites/:siteId/equipment/new" element={<EquipmentForm />} />
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
        <Route path="/equipment/:id/edit" element={<EquipmentForm />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
