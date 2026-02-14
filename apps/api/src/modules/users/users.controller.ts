import {
  Controller,
  Put,
  Post,
  Body,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return user profile' })
  async getProfile(@AuthenticatedUser() user: any) {
    // Auto-provisions a PostgreSQL record on first access
    return this.usersService.findOrCreateByKeycloakId(user.sub, user.email);
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

  @Public()
  @Post('guest')
  @ApiOperation({ summary: 'Register as a guest user (no Keycloak account)' })
  @ApiResponse({ status: 201, description: 'Guest user created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async createGuest(
    @Body() data: { email: string; phoneNumber?: string }
  ) {
    return this.usersService.createGuest(data);
  }
}
