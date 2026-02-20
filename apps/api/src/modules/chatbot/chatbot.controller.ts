import { Controller, Post, Body, Get } from '@nestjs/common';
import { BaseController } from '../common/controllers/base.controller';
import { ChatbotService } from './chatbot.service';
import { UsersService } from '../users/users.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController extends BaseController {
  constructor(
    private chatbotService: ChatbotService,
    usersService: UsersService,
  ) {
    super(usersService);
  }

  @Public() //Anyone can ask general product questions
  @Post('message')
  @ApiOperation({ summary: 'Send a message to Rowan the chatbot' })
  @ApiBody({
    description: 'The message to send to the chatbot',
    type: ChatMessageDto,
  })
  @ApiResponse({ status: 200, description: 'The chatbot response' })
  async handleMessage(
    @Body() chatMessageDto: ChatMessageDto,
    @AuthenticatedUser() user?: any
  ) {
    let userId = user?.sub;
    if (userId) {
      userId = await this.resolveUserId(userId);
    }
    //If the user is logged in, we can provider their order info
    return this.chatbotService.processMessage(chatMessageDto.text, userId);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get chatbot conversation history for the current user',
  })
  @ApiResponse({ status: 200, description: 'List of previous messages' })
  async getHistory(@AuthenticatedUser() user: any) {
    //Only logged in users can see their conversaton history
    const userId = await this.resolveUserId(user.sub);
    return this.chatbotService.getHistory(userId);
  }
}
