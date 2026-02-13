import {
  Controller,
  Put,
  Body,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return user profile' })
  async getProfile(@AuthenticatedUser() user: any) {
    return this.usersService.findByKeycloakId(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @AuthenticatedUser() user: any,
    @Body() updateData: Partial<User>
  ) {
    return this.usersService.updateProfile(user.sub, updateData);
  }
}
