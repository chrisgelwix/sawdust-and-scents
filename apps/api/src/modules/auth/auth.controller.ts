import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './decorators/user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the currently logged-in user profile',
  })
  getProfile(@AuthenticatedUser() user: any) {
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      roles: user.resource_access?.['sdas-api']?.roles || [],
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an access token using a refresh token' })
  @ApiResponse({ status: 201, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() body: { refresh_token: string }) {
    const keycloakUrl = this.configService.get('KEYCLOAK_URL');
    const realm = this.configService.get('KEYCLOAK_REALM');
    const clientId = this.configService.get('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get('KEYCLOAK_CLIENT_SECRET') || '';

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: body.refresh_token,
    });

    const response = await fetch(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        message: errorData.error_description || 'Token refresh failed',
      };
    }

    return response.json();
  }
}
