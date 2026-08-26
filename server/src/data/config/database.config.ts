import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const sslEnabled = ['true', '1', 'required'].includes(
    String(process.env.DB_SSL ?? '').toLowerCase(),
  );

  const sslConfig = sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(process.env.DB_SSL_CA_PATH
          ? {
              ca: fs.readFileSync(
                path.resolve(process.cwd(), process.env.DB_SSL_CA_PATH),
                'utf8',
              ),
            }
          : {}),
      }
    : false;

  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'animelog',
    entities: [
      __dirname + '/../../**/*.entity{.ts,.js}',
      __dirname + '/../../**/*.model{.ts,.js}',
    ],
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOG === 'true',
    migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
    ssl: sslConfig,
    charset: 'utf8mb4',
    extra: {
      connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    },
  };
};
