import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { APP_GUARD, ModuleRef } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { CatalogV2Module } from './catalog-v2/catalog-v2.module';
import { AdminCatalogModule } from './adminCatalog';
import { BlogPostsModule } from './blogPosts';
import { CommunityEventsModule } from './communityEvents';
import { HealthController } from './health/health.controller';
import { JSONScalar } from './graphql/scalars';
import configuration from './config/configuration';
import { createContextFactory } from './graphql/context';

// Import to register enums
import './graphql/enums';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    // Metrics
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting: 100 requests per minute per visitor (x-client-ip from
    // the gateway). Guest registration has its own, stricter limit.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // GraphQL Federation
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (moduleRef: ModuleRef) => ({
        autoSchemaFile: {
          federation: 2,
        },
        sortSchema: true,
        playground: process.env.ENVIRONMENT !== 'production',
        // Fresh context per request — resolves language from Accept-Language header
        // and creates new DataLoaders to prevent stale cache between requests
        context: createContextFactory(moduleRef),
        formatError: (error) => {
          if (process.env.ENVIRONMENT === 'production') {
            delete error.extensions?.exception;
          }
          return error;
        },
      }),
      inject: [ModuleRef],
    }),

    // Database
    PrismaModule,

    // Feature modules
    CatalogV2Module,

    // Platform-admin catalog CRUD (raw reads + bulk upsert/XLSX)
    AdminCatalogModule,

    // Platform-admin authoring (form-based CRUD)
    BlogPostsModule,
    CommunityEventsModule,
  ],
  controllers: [HealthController],
  providers: [JSONScalar, { provide: APP_GUARD, useClass: GqlThrottlerGuard }],
})
export class AppModule {}
