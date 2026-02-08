import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    type: String,
    description: 'The message text to send to the chatbot',
    example: 'Tell me about your sandalwood candles.',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}
