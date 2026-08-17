/**
 * Small, quiet reference id shown on unexpected failures so the user can
 * quote it to an administrator, who matches it to the developer log. No
 * internals are encoded in it – it is a log lookup key only.
 */
export function ErrorReference({ reference }: { reference: string }) {
  return (
    <p className="mt-4 select-all font-mono text-xs text-ink-faint" aria-label={`Error reference ${reference}`}>
      Error reference: {reference}
    </p>
  );
}
