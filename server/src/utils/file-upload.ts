import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
   'image/jpeg': '.jpg',
   'image/png': '.png',
   'image/webp': '.webp',
   'image/gif': '.gif',
};

export function resolveUploadsDir(): string {
   const uploadsDir = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

   if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
   }

   return uploadsDir;
}

export function avatarUploadOptions() {
   return {
      storage: diskStorage({
         destination: (_req: unknown, _file: unknown, callback: (error: Error | null, destination: string) => void) => {
            try {
               callback(null, resolveUploadsDir());
            } catch (error) {
               callback(error as Error, '');
            }
         },
         filename: (_req: unknown, file: { mimetype?: string; originalname?: string }, callback: (error: Error | null, filename: string) => void) => {
            const extension =
               ALLOWED_MIME_EXTENSIONS[file.mimetype ?? ''] ?? extname(file.originalname ?? '').toLowerCase();
            callback(null, `${randomUUID()}${extension}`);
         },
      }),
      fileFilter: (
         _req: unknown,
         file: { mimetype?: string },
         callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
         if (!file.mimetype || !ALLOWED_MIME_EXTENSIONS[file.mimetype]) {
            callback(new BadRequestException('Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.'), false);
            return;
         }

         callback(null, true);
      },
      limits: {
         fileSize: MAX_AVATAR_SIZE_BYTES,
      },
   };
}
