import { Controller, Get } from '@nestjs/common';
import { 
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
} from '@nestjs/swagger';
import {AuthenticatedUser} from './decorators/user.decorator';

@ApiTags('auth') //Groups these routes together in Swagger

@Controller('auth')
export class AuthController {
    
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get the currently logged in user profile'
    })
    getProfile(@AuthenticatedUser() user: any) {
        return {
            id: user.sub,
            email: user.email,
            name: user.name,
            roles: user.resource_access?.['sdas-api']?.roles || [],
        };
    }
}