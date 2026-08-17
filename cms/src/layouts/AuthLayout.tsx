import { Outlet } from 'react-router-dom';

/**
 * Sign-in surface (spec §36). The auth card is constrained to one responsive
 * column and centered on the viewport.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-stretch">
        <Outlet />
      </div>
    </div>
  );
}
