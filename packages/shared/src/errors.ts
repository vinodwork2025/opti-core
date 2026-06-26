export class OptiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context: Record<string, unknown> = {},
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'OptiError';
  }
}

export class ValidationError extends OptiError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super('VALIDATION_ERROR', message, context, false);
    this.name = 'ValidationError';
  }
}

export class CrawlerError extends OptiError {
  constructor(message: string, context: Record<string, unknown> = {}, retryable = true) {
    super('CRAWLER_ERROR', message, context, retryable);
    this.name = 'CrawlerError';
  }
}

export class AIError extends OptiError {
  constructor(message: string, context: Record<string, unknown> = {}, retryable = true) {
    super('AI_ERROR', message, context, retryable);
    this.name = 'AIError';
  }
}
