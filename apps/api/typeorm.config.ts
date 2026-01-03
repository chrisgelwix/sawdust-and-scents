import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT as string),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['apps/api/src/**/*.entity.ts'],
  migrations: ['apps/api/src/migrations/*.ts'],
});
