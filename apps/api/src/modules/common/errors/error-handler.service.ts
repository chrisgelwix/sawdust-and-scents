import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
  NotImplementedException,
  UnprocessableEntityException,
  MethodNotAllowedException,
  RequestTimeoutException,
} from '@nestjs/common';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger('ErrorHandler');
  /**
   * The "Magic" Method: Call this in your catch blocks
   * @param error The raw error caught
   * @param context Where the error happened (e.g., 'OrdersService.create')
   */
  handleError(error: any, context?: string): never {
    const errorSource = context ? `[${context}] ` : '';

    if (error.code === '23505') {
      this.logger.warn(
        `${errorSource}Duplicate key violation: ${error.detail}`
      );
      throw new ConflictException(
        'A record with this information already exists.'
      );
    }

    if (error.code === '23503') {
      this.logger.warn(`${errorSource}Foreign key violation: ${error.detail}`);
      throw new BadRequestException('The referenced record does not exist.');
    }

    if (error.name === 'ValidationError') {
      this.logger.warn(
        `${errorSource}Mongoose Validation Error: ${error.message}`
      );
      throw new BadRequestException(
        'Invalid data format for product attributes.'
      );
    }

    if (error.response?.status === 401) {
      this.logger.error(`${errorSource}External API Authentication Failure`);
      throw new UnauthorizedException('Service is temporarily unavailable.');
    }

    if (error.status && error.message) {
      throw error;
    }

    this.logger.error(
      `${errorSource}Unexpected Error: ${error.message}`,
      error.stack
    );
    throw new InternalServerErrorException(
      'An internal server error occurred. Our team has been notified.'
    );
  }
}
