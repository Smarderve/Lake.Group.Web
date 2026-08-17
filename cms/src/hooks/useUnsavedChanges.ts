import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Unsaved-changes protection (Error-Handling §22). Guards two ways:
 *  - beforeunload: refresh / close / external navigation never silently
 *    discards the form;
 *  - a react-router blocker: in-app navigation asks for confirmation.
 * Failed saves never clear the form anyway – this only triggers when the
 * user tries to leave while the form is dirty.
 */
export function useUnsavedChanges(isDirty: boolean, message = 'You have unsaved changes. Leave anyway?') {
  // Browser-level guard (refresh, tab close, address-bar navigation).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // In-app navigation guard. Requires a data router (the app uses
  // createBrowserRouter). When blocked, ask once and honour the answer.
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    // eslint-disable-next-line no-alert -- leaving with unsaved work needs a decision
    const leave = window.confirm(message);
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);

  return blocker;
}
