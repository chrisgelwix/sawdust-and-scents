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
        ssl: { rejectUnauthorized: false },
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
        const user     = config.getOrThrow<string>('MONGO_USER');
        const password = config.getOrThrow<string>('MONGO_PASSWORD');
        const host     = config.getOrThrow<string>('MONGO_HOST');
        const port     = config.get<string>('MONGO_PORT') ?? '27017';
        const db       = config.get<string>('MONGO_DB')   ?? 'sawdust_scents';

        const uri = [
          `mongodb://${user}:${encodeURIComponent(password)}`,
          `@${host}:${port}/${db}`,
          `?replicaSet=rs0`,
          `&readPreference=secondaryPreferred`,
          `&retryWrites=false`,
          `&authMechanism=SCRAM-SHA-1`,
        ].join('');

        return { uri };
      },
    }),
  ],
  exports: [TypeOrmModule, MongooseModule],
})
export class DatabaseModule {}
