import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // -- PostgreSQL via TypeORM --
    // Connects to the RDS instance using credentials injected from Secrets Manager at runtime.
    // ssl.rejectUnauthorized: false accepts the RDS-managed certificate without needing to
    // bundle the Amazon root CA cert inside the Docker image.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('POSTGRES_HOST'),
        port:     config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        // Local Postgres typically runs without SSL; RDS commonly requires it.
        ssl: config.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
      }),
    }),

    // -- MongoDB via Mongoose → Amazon DocumentDB --
    // DocumentDB is MongoDB-protocol-compatible (5.0) but has three hard requirements
    // that differ from vanilla MongoDB:
    //
    //   replicaSet=rs0              — DocumentDB always presents itself as a replica set
    //   readPreference=secondaryPreferred — AWS recommendation for DocumentDB clusters
    //   retryWrites=false           — DocumentDB does not support MongoDB retryable writes;
    //                                 the Mongoose/MongoDB driver will error on startup
    //                                 without this flag
    //
    // TLS note: the DocumentDB cluster parameter group sets tls=disabled in the test
    // environment so no CA bundle is needed.  For production, set tls=enabled on the
    // parameter group and add ?tls=true&tlsCAFile=/app/certs/rds-combined-ca-bundle.pem
    // to the URI (the cert must be bundled in the Docker image).
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const explicitUri = (config.get<string>('MONGO_URI') ?? '').trim();
        if (explicitUri) return { uri: explicitUri };

        const user = (config.getOrThrow<string>('MONGO_USER') ?? '').trim();
        const password = (config.getOrThrow<string>('MONGO_PASSWORD') ?? '').trim();
        const host     = config.getOrThrow<string>('MONGO_HOST');
        const port     = config.get<string>('MONGO_PORT') ?? '27017';
        const db       = config.get<string>('MONGO_DB')   ?? 'sawdust_scents';

        if (!user || !password) {
          throw new Error(
            'MongoDB credentials missing. Set MONGO_USER and MONGO_PASSWORD (or provide MONGO_URI).'
          );
        }

        const isDocumentDb =
          (config.get<string>('MONGO_DOCUMENTDB') ?? '').toLowerCase() === 'true' ||
          (config.get<string>('NODE_ENV') ?? '').toLowerCase() === 'production';

        const query: string[] = [];
        // Typical local Mongo auth uses authSource=admin; DocumentDB does as well.
        query.push('authSource=admin');

        if (isDocumentDb) {
          query.push('replicaSet=rs0');
          query.push('readPreference=secondaryPreferred');
          query.push('retryWrites=false');
          query.push('authMechanism=SCRAM-SHA-1');
        }

        const uri =
          `mongodb://${user}:${encodeURIComponent(password)}` +
          `@${host}:${port}/${db}` +
          `?${query.join('&')}`;

        return { uri };
      },
    }),
  ],
  exports: [TypeOrmModule, MongooseModule],
})
export class DatabaseModule {}
