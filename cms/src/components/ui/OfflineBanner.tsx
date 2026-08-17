import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import wifiOffOutline from '@iconify-icons/mdi/wifi-off';
import wifiOutline from '@iconify-icons/mdi/wifi';
import { cn } from '../../utils/cn';

/** True when the browser reports the network is reachable. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

type Phase = 'online' | 'offline' | 'restored';

/**
 * Persistent, non-destructive connectivity banner. Offline shows a calm strip
 * telling the user their work is still safe (no reload, no data loss); when
 * the connection returns it briefly announces "Connection restored".
 */
export function OfflineBanner() {
  const online = useOnline();
  const [phase, setPhase] = useState<Phase>(online ? 'online' : 'offline');
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setPhase('offline');
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setPhase('restored');
      const t = window.setTimeout(() => setPhase('online'), 2500);
      return () => window.clearTimeout(t);
    }
    setPhase('online');
  }, [online]);

  if (phase === 'online') return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4',
      )}
    >
      <div
        className={cn(
          'cms-animate-toast pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-surface px-4 py-2.5 shadow-pop',
          phase === 'offline' ? 'border-amber-200 text-amber-800' : 'border-emerald-200 text-emerald-800',
        )}
      >
        <Icon
          icon={phase === 'offline' ? wifiOffOutline : wifiOutline}
          className={cn('h-4 w-4', phase === 'offline' ? 'text-amber-600' : 'text-emerald-600')}
          aria-hidden="true"
        />
        <p className="text-sm font-medium">
          {phase === 'offline'
            ? "You're offline – check your internet connection. Your unsaved changes are still here."
            : 'Connection restored'}
        </p>
      </div>
    </div>
  );
}
