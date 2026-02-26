import { 
  Controller, 
  Get, 
  Post, 
  Body,
  BadRequestException,
  ConflictException,
  InternalServerErrorException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './decorators/user.decorator';
import { Public } from './decorators/public.decorator';
// bad-words and naughty-words both use CJS — require() is correct in NestJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BadWords = require('bad-words');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const naughtyWords = require('naughty-words');
const profanityFilter = new BadWords();
// Extend with naughty-words English list (slurs, hate speech, identity-based terms)
profanityFilter.addWords(...naughtyWords.en);

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString() firstName!: string;
  @IsString() lastName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  friendlyName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsBoolean()
  @IsOptional()
  smsOptIn?: boolean;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status:201, description: 'Account created successfully' })
  @ApiResponse({ status:409, description: 'Email already in use' })
  async register(@Body() registerDto: RegisterDto) {

      // Guard: reject profanity in display name before hitting Keycloak
      if (registerDto.friendlyName && profanityFilter.isProfane(registerDto.friendlyName)) {
        throw new BadRequestException('Display name contains inappropriate language');
      }

      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');

      const tokenResponse = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: this.configService.get<string>('KEYCLOAK_ADMIN') as string,
            password: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD') as string,
          }),
        } 
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new InternalServerErrorException(errorData.error_description || 'Failed to get admin token');
      }
      
      const tokenData = await tokenResponse.json();
      const createAccountResponse = await fetch(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          body: JSON.stringify({
            username: registerDto.email,
            email: registerDto.email,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            enabled: true,
            emailVerified: true,
            credentials: [
              {
                type: 'password',
                value: registerDto.password,
                temporary: false,
              },
            ],
            attributes: {
              ...(registerDto.friendlyName && { friendlyName: [registerDto.friendlyName] }),
              ...(registerDto.phoneNumber  && { phoneNumber:  [registerDto.phoneNumber] }),
              ...(registerDto.phoneNumber  && { smsOptIn:     [String(registerDto.smsOptIn ?? false)] }),
              ...(registerDto.phoneNumber  && { smsOptInDate: [new Date().toISOString()] }),
            },
          })
        }
      );

      if(createAccountResponse.status === 409)  {
        throw new ConflictException('An account with this email is already in use.');
      }
      if(!createAccountResponse.ok) {
        const errorData = await createAccountResponse.json();
        throw new InternalServerErrorException(errorData.error_description || 'Failed to create account');
      }

      return {
        statusCode: createAccountResponse.status,
        message: 'Account created successfully',
      };
  }

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
