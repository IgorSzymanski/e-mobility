import { cleanupOpenApiDoc } from 'nestjs-zod'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
// import nock from 'nock'
// import { createOcpiSuccessResponse } from './ocpi/v2_2_1/common/ocpi-envelope'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // nock('http://localhost:8010')
  //   .get('/ocpi/cpo/versions')
  //   .reply(
  //     200,
  //     createOcpiSuccessResponse([
  //       {
  //         version: '2.1.1',
  //         url: 'http://localhost:8010/ocpi/cpo/2.1.1',
  //       },
  //       {
  //         version: '2.2',
  //         url: 'http://localhost:8010/ocpi/cpo/2.2',
  //       },
  //       {
  //         version: '2.2.1',
  //         url: 'http://localhost:8010/ocpi/cpo/2.2.1',
  //       },
  //     ]),
  //   )
  //   .get('/ocpi/cpo/2.2.1')
  //   .reply(
  //     200,
  //     createOcpiSuccessResponse({
  //       version: '2.2.1',
  //       endpoints: [],
  //     }),
  //   )

  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Example API')
      .setDescription('Example API description')
      .setVersion('1.0')
      .build(),
  )

  SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc))
  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
