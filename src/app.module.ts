import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod'
import { APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { OcpiModule } from './ocpi/ocpi.module'
import { OcpiExceptionFilter } from '@/shared/filters'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    OcpiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: OcpiExceptionFilter,
    },
  ],
})
export class AppModule {}
