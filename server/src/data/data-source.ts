import { config as loadEnv } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

const sslEnabled = ['true', '1', 'required'].includes(
  String(process.env.DB_SSL ?? '').toLowerCase(),
);

const caPath = process.env.DB_SSL_CA_PATH;

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'animelog',
  charset: 'utf8mb4',
  entities: [path.join(__dirname, '../**/*.model{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.DB_LOG === 'true',
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ...(caPath
          ? { ca: fs.readFileSync(path.resolve(process.cwd(), caPath), 'utf8') }
          : {}),
      }
    : undefined,
};

export default new DataSource(dataSourceOptions);
