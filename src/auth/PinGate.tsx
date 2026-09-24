import { useState, type ReactNode } from 'react';

// A lightweight local barrier, not a real login: no account, no server-side
// rejection, no lockout. Enter the PIN, it's checked on-device against a
// stored hash, and you're in — remembered on this device from then on.
// This is deliberately NOT strong security (the hash ships in the app's
// code, so it's a deterrent against casual snooping, not a determined
// attacker) — see NOTES.md for the tradeoff this was chosen over.
const PIN_HASH = import.meta.env.VITE_APP_PIN_HASH as string | undefined;
const STORAGE_KEY = 'service-log-unlocked';

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// Re-locks this device — clears the "unlocked" flag and reloads, so the
// PIN screen shows again. Used by the "Lock App" button in More.
export function lockApp() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.location.reload();
}

export default function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!PIN_HASH) {
    // Not configured — don't lock anyone out over a setup gap.
    return <>{children}</>;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await sha256Hex(pin);
    if (hash === PIN_HASH) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // ignore — will just ask again next load
      }
      setUnlocked(true);
    } else {
      setError(true);
      setPin('');
    }
    setChecking(false);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-950 px-6">
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <div className="text-2xl font-bold text-white mb-1">Service Log</div>
        <div className="text-zinc-500 text-sm mb-6">Enter PIN</div>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
          className="w-full text-center text-3xl tracking-[0.5em] rounded-xl bg-zinc-900 border border-zinc-700 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <div className="text-red-400 text-sm mt-3">Wrong PIN — try again.</div>}
        <button
          type="submit"
          disabled={!pin || checking}
          className="w-full mt-5 rounded-xl bg-blue-600 disabled:opacity-40 text-white font-bold text-base py-3.5"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
