import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

export function validateStorageKey(key) {
  if (!SAFE_KEY.test(key) || key.includes('..') || key.includes('\\') || key.startsWith('/')) {
    throw new Error('Invalid storage key');
  }
  return key;
}

function publicUrl(baseUrl, key) {
  return `${baseUrl.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function createLocalStorage({ directory, publicBaseUrl }) {
  const root = path.resolve(directory);
  const target = (key) => path.join(root, ...validateStorageKey(key).split('/'));
  return {
    provider: 'local',
    publicDirectory: root,
    async put({ key, body }) {
      const filePath = target(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const temporary = `${filePath}.${process.pid}.tmp`;
      await fs.writeFile(temporary, body, { flag: 'wx' });
      await fs.rename(temporary, filePath);
      return { key, url: publicUrl(publicBaseUrl, key) };
    },
    async delete(key) {
      await fs.rm(target(key), { force: true });
    },
    resolve(key) {
      return target(key);
    },
  };
}

export function createS3Storage({
  region,
  bucket,
  endpoint,
  forcePathStyle = false,
  publicBaseUrl,
  credentials,
  client,
}) {
  const s3 = client ?? new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle,
    ...(credentials?.accessKeyId && credentials?.secretAccessKey ? { credentials } : {}),
  });
  return {
    provider: 's3',
    async put({
      key,
      body,
      contentType,
      contentDisposition,
      cacheControl = 'public, max-age=31536000, immutable',
    }) {
      validateStorageKey(key);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentDisposition ? { ContentDisposition: contentDisposition } : {}),
        CacheControl: cacheControl,
      }));
      return { key, url: publicUrl(publicBaseUrl, key) };
    },
    async delete(key) {
      validateStorageKey(key);
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export function createObjectStorage(config) {
  if (config.mediaStorageDriver === 's3') {
    return createS3Storage({
      region: config.s3Region,
      bucket: config.s3Bucket,
      endpoint: config.s3Endpoint,
      forcePathStyle: config.s3ForcePathStyle,
      publicBaseUrl: config.mediaPublicBaseUrl,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return createLocalStorage({
    directory: config.mediaStorageLocalDir,
    publicBaseUrl: config.mediaPublicBaseUrl || '/media/files',
  });
}
