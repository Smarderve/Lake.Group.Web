/**
 * Error-handling system tests (Error-Handling task §27/§28).
 *
 * Covers: the root boundary never leaks internals and recovers; ErrorState
 * variants speak the shared language; the taxonomy classifies every status
 * and produces calm user-safe copy; references are safe and unique; the
 * offline banner reacts to connectivity changes.
 */
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ErrorBoundary } from '../src/app/error-boundary';
import { ErrorState } from '../src/components/ui/ErrorState';
import { ErrorReference } from '../src/components/ui/ErrorReference';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { RouteErrorPage } from '../src/pages/RouteErrorPage';
import { ApiError, apiErrorMessage } from '../src/services/api';
import { classifyError, friendlyMessage, makeErrorReference, ErrorKind } from '../src/services/errors';

// Quiet the boundary's intentional console noise during tests.
vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  /** Throws while `armed`; used to prove both capture and recovery. */
  function Bomb({ armed, message }: { armed: boolean; message: string }) {
    if (armed) throw new Error(message);
    return <p>Recovered content</p>;
  }

  function Harness() {
    const [armed, setArmed] = useState(true);
    return (
      <div>
        <ErrorBoundary>
          <Bomb armed={armed} message="useContext, dispatcher is null" />
        </ErrorBoundary>
        {/* Lives outside the boundary so it survives the fallback render. */}
        <button type="button" onClick={() => setArmed(false)}>
          defuse
        </button>
      </div>
    );
  }

  it('shows sanitized UI with no internals for a render crash', () => {
    render(
      <ErrorBoundary>
        <Bomb armed message="useContext, dispatcher is null" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("We couldn't load this part of the CMS. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/app');
    // The raw crash text and any implementation detail must never surface.
    expect(screen.queryByText(/dispatcher is null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/useContext/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.tsx?:\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/node_modules/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ProtectedRoute/)).not.toBeInTheDocument();
    // A safe log-lookup reference is shown.
    expect(screen.getByText(/Error reference: ERR-[A-Z0-9]{6}/)).toBeInTheDocument();
  });

  it('recovers via Try again when the underlying cause clears', async () => {
    render(<Harness />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Clear the cause first (control is outside the boundary), then recover.
    fireEvent.click(screen.getByRole('button', { name: 'defuse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Recovered content')).toBeInTheDocument());
  });

  it('logs a redacted entry with a reference (developer channel only)', () => {
    const logged: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      logged.push(args);
    });
    render(
      <ErrorBoundary>
        <Bomb armed message="secret internal detail" />
      </ErrorBoundary>,
    );
    expect(logged.length).toBeGreaterThan(0);
    const entry = JSON.stringify(logged);
    expect(entry).toContain('ERR-');
  });
});

describe('ErrorState variants', () => {
  const cases: Array<[Parameters<typeof ErrorState>[0]['variant'], string]> = [
    ['network', "You're offline"],
    ['permission', 'Access restricted'],
    ['not-found', 'Page not found'],
    ['session', 'Your session has expired'],
    ['server', 'Something went wrong'],
    ['maintenance', 'Lake Group CMS is temporarily unavailable'],
  ];

  it.each(cases)('%s variant shows its default title', (variant, title) => {
    render(<ErrorState variant={variant} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('explicit copy overrides variant defaults', () => {
    render(<ErrorState variant="server" title="Custom title" message="Custom message" />);
    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('renders a Try again action when provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState variant="server" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Error taxonomy', () => {
  it('classifies every status into the shared taxonomy', () => {
    const expected: Array<[ApiError, ErrorKind]> = [
      [new ApiError(0, 'NETWORK_ERROR', 'net'), 'network'],
      [new ApiError(0, 'TIMEOUT', 'timeout'), 'timeout'],
      [new ApiError(400, 'VALIDATION', 'bad'), 'validation'],
      [new ApiError(422, 'VALIDATION', 'bad'), 'validation'],
      [new ApiError(401, 'UNAUTHENTICATED', 'auth'), 'unauthenticated'],
      [new ApiError(403, 'FORBIDDEN', 'denied'), 'forbidden'],
      [new ApiError(404, 'NOT_FOUND', 'gone'), 'not-found'],
      [new ApiError(409, 'CONFLICT', 'stale'), 'conflict'],
      [new ApiError(429, 'RATE_LIMITED', 'slow down'), 'rate-limit'],
      [new ApiError(502, 'BAD_GATEWAY', 'upstream'), 'service-unavailable'],
      [new ApiError(503, 'SERVICE_UNAVAILABLE', 'down'), 'service-unavailable'],
      [new ApiError(504, 'GATEWAY_TIMEOUT', 'slow'), 'service-unavailable'],
      [new ApiError(500, 'INTERNAL', 'boom'), 'server'],
    ];
    for (const [err, kind] of expected) {
      expect(classifyError(err).kind).toBe(kind);
    }
  });

  it('maps infra failures to calm user-safe copy', () => {
    expect(friendlyMessage(new ApiError(429, 'RATE_LIMITED', 'raw'))).toBe(
      'Too many requests. Please wait a moment before trying again.',
    );
    expect(friendlyMessage(new ApiError(500, 'INTERNAL', 'raw'))).toBe(
      "We couldn't complete that request. Please try again.",
    );
    expect(friendlyMessage(new ApiError(503, 'SERVICE_UNAVAILABLE', 'raw'))).toBe(
      'The CMS service is temporarily unavailable. Please try again shortly.',
    );
    expect(friendlyMessage(new ApiError(0, 'NETWORK_ERROR', 'raw'))).toBe(
      'Unable to reach the server. Check your connection and try again.',
    );
    expect(friendlyMessage(new ApiError(0, 'TIMEOUT', 'raw'))).toBe('The request timed out. Please try again.');
  });

  it('keeps specific backend business messages where they are useful', () => {
    expect(friendlyMessage(new ApiError(409, 'CONFLICT', 'A company with this slug already exists'))).toBe(
      'A company with this slug already exists',
    );
    expect(friendlyMessage(new ApiError(422, 'VALIDATION', 'Title is required'))).toBe('Title is required');
  });

  it('apiErrorMessage routes through the taxonomy and honours the fallback', () => {
    expect(apiErrorMessage(new ApiError(503, 'SERVICE_UNAVAILABLE', 'raw'))).toContain('temporarily unavailable');
    expect(apiErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });

  it('generates unique, safe reference ids', () => {
    const a = makeErrorReference();
    const b = makeErrorReference();
    expect(a).toMatch(/^ERR-[A-Z0-9]{6}$/);
    expect(b).toMatch(/^ERR-[A-Z0-9]{6}$/);
    expect(a).not.toBe(b);
  });
});

describe('ErrorReference', () => {
  it('renders the reference readably and copies on select', () => {
    render(<ErrorReference reference="ERR-ABC123" />);
    expect(screen.getByText('Error reference: ERR-ABC123')).toBeInTheDocument();
  });
});

describe('RouteErrorPage', () => {
  /** Renders RouteErrorPage against a real router with a throwing route. */
  function renderWithRouteError(status?: number) {
    function ThrowingRoute() {
      throw new Error('loader exploded, dispatcher is null');
    }
    const router = createMemoryRouter(
      [
        {
          path: '/',
          errorElement: <RouteErrorPage />,
          children: [
            { index: true, element: <ThrowingRoute /> },
            {
              path: 'missing',
              // react-router turns a thrown Response into a route error response.
              loader: async () => {
                throw new Response('gone', { status: status ?? 404, statusText: 'Not Found' });
              },
              element: <p>never</p>,
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    );
    return render(<RouterProvider router={router} />);
  }

  it('sanitizes an unexpected route failure with a reference and recovery', async () => {
    renderWithRouteError();
    // Calm copy, no internals: the raw message and file paths never surface.
    expect(await screen.findByText("We're having trouble loading this page. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/dispatcher is null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/loader exploded/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Error reference: ERR-[A-Z0-9]{6}/)).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it('shows nothing while online, announces offline, then restored', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    render(<OfflineBanner />);
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(await screen.findByText(/You're offline/)).toBeInTheDocument();

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    expect(await screen.findByText('Connection restored')).toBeInTheDocument();
  });
});
