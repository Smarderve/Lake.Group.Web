import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatBytes, formatDate, formatNumber, relativeTime } from '../src/utils/format';
import { isImageMedia, mediaPreviewUrl, resolveMediaUrl, type MediaRow } from '../src/features/media/api';

function media(overrides: Partial<MediaRow> = {}): MediaRow {
  return {
    id: 'media-1',
    url: 'https://cdn.example.com/original.jpg',
    altText: null,
    caption: null,
    mimeType: 'image/jpeg',
    sizeBytes: null,
    width: null,
    height: null,
    copyright: null,
    license: null,
    tags: null,
    variants: null,
    folderId: null,
    uploadedBy: null,
    status: 'PUBLISHED',
    createdAt: '2026-08-13T12:00:00.000Z',
    updatedAt: '2026-08-13T12:00:00.000Z',
    ...overrides,
    storageProvider: overrides.storageProvider ?? null,
    storageKey: overrides.storageKey ?? null,
  };
}

describe('presentation transformations', () => {
  it('formats invalid and valid dates without throwing', () => {
    expect(formatDate('not-a-date')).toBe('–');
    expect(formatDate('2026-08-13T12:00:00.000Z')).toContain('2026');
  });

  it('formats relative timestamps across minute, hour, and day boundaries', () => {
    const now = new Date('2026-08-13T12:00:00.000Z');
    expect(relativeTime('2026-08-13T11:59:30.000Z', now)).toBe('just now');
    expect(relativeTime('2026-08-13T11:30:00.000Z', now)).toBe('30m ago');
    expect(relativeTime('2026-08-13T10:00:00.000Z', now)).toBe('2h ago');
    expect(relativeTime('2026-08-11T12:00:00.000Z', now)).toBe('2d ago');
  });

  it('formats compact values and binary byte sizes', () => {
    expect(formatNumber(1_250_000)).toBe('1.3M');
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
    expect(formatBytes(-1)).toBe('–');
  });

  it('resolves website-relative media URLs against the public site origin', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://lake-group.vercel.app');
    expect(resolveMediaUrl('assets/images/gccp/photo_6.jpg')).toBe(
      'https://lake-group.vercel.app/assets/images/gccp/photo_6.jpg',
    );
    expect(resolveMediaUrl('/assets/images/news/19/photo_2.jpg')).toBe(
      'https://lake-group.vercel.app/assets/images/news/19/photo_2.jpg',
    );
    // Query strings used by the website (e.g. ?v=80) survive resolution.
    expect(resolveMediaUrl('assets/images/lakesteel/ops/rebar-yard.jpg?v=80')).toBe(
      'https://lake-group.vercel.app/assets/images/lakesteel/ops/rebar-yard.jpg?v=80',
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('leaves absolute URLs and API upload paths untouched', () => {
    expect(resolveMediaUrl('https://cdn.example.com/original.jpg')).toBe('https://cdn.example.com/original.jpg');
    expect(resolveMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    // Backend uploads stay same-origin (Vite proxies /media in dev).
    expect(resolveMediaUrl('/media/files/2026/08/photo.jpg')).toBe('/media/files/2026/08/photo.jpg');
  });

  it('selects media thumbnails and detects images defensively', () => {
    expect(mediaPreviewUrl(media({ variants: { thumb: 'https://cdn.example.com/thumb.webp' } }))).toBe(
      'https://cdn.example.com/thumb.webp',
    );
    expect(mediaPreviewUrl(media())).toBe('https://cdn.example.com/original.jpg');
    expect(isImageMedia(media({ mimeType: 'image/webp', url: 'https://cdn.example.com/no-extension' }))).toBe(true);
    expect(isImageMedia(media({ mimeType: null, url: 'https://cdn.example.com/photo.AVIF' }))).toBe(true);
    expect(isImageMedia(media({ mimeType: 'application/pdf', url: 'https://cdn.example.com/report.pdf' }))).toBe(false);
    // Cache-busted website URLs (?v=80) still count as images.
    expect(isImageMedia(media({ mimeType: null, url: 'assets/images/lakebuildings/ops/lake-tanks.jpg?v=80' }))).toBe(true);
  });
});
