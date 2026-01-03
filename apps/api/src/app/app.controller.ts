import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('secure-test')
  getSecureData() {
    return { message: 'If you see this, you are logged in!' };
  }
}
