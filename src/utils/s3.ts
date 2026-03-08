// src/utils/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { logger } from '../config/logger';
import path from 'path';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'placeholder',
  },
});

export async function uploadFileToS3(
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<string> {
  if (!env.AWS_S3_BUCKET || !env.AWS_ACCESS_KEY_ID) {
    // Return a placeholder URL in dev
    logger.warn('[S3 skipped] Returning placeholder URL');
    return `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(file.originalname)}`;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'max-age=31536000',
  }));

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteFileFromS3(url: string): Promise<void> {
  if (!env.AWS_S3_BUCKET || !url.includes(env.AWS_S3_BUCKET)) return;

  try {
    const key = url.split('.amazonaws.com/')[1];
    if (!key) return;

    await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
  } catch (err) {
    logger.error('Failed to delete S3 file:', err);
  }
}
