import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { SweetbookModule } from './sweetbook/sweetbook.module';
import { TestModule } from './test/test.module';
import { YearbookModule } from './yearbook/yearbook.module';
import { BookPurchaseRequest } from './entities/book-purchase-request.entity';
import { LayoutTemplate } from './entities/layout-template.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get<string>('DB_PORT') ?? '3306');
        return {
          type: 'mysql' as const,
          host: config.get<string>('DB_HOST') ?? '127.0.0.1',
          port: Number.isFinite(port) ? port : 3306,
          username: config.get<string>('DB_USERNAME') ?? 'root',
          password: config.get<string>('DB_PASSWORD') ?? '',
          database: config.get<string>('DB_DATABASE') ?? 'sweetbook',
          entities: [User, BookPurchaseRequest, LayoutTemplate],
          synchronize: config.get<string>('TYPEORM_SYNC') !== 'false',
          logging: config.get<string>('TYPEORM_LOGGING') === 'true',
        };
      },
    }),
    AuthModule,
    SweetbookModule,
    YearbookModule,
    TestModule,
  ],
})
export class AppModule {}
