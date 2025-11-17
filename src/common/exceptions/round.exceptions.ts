import { HttpException, HttpStatus } from '@nestjs/common';

export class RoundNotActiveException extends HttpException {
  constructor(roundId: string, currentStatus: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Round ${roundId} is not active. Current status: ${currentStatus}`,
        error: 'RoundNotActive',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class RoundTimeInvalidException extends HttpException {
  constructor(message: string = 'Cannot tap: round time is invalid') {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'RoundTimeInvalid',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class RoundNotFoundException extends HttpException {
  constructor(roundId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Round with ID ${roundId} not found`,
        error: 'RoundNotFound',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class RoundCreationException extends HttpException {
  constructor(message: string = 'Failed to create round') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'RoundCreationFailed',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class TapProcessingException extends HttpException {
  constructor(message: string = 'Failed to process tap. Please try again.') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'TapProcessingFailed',
      },
      HttpStatus.CONFLICT,
    );
  }
}
