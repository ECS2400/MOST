/** Base class for controlled LLM provider adapter errors. */
export class LlmProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LlmProviderError';
    this.code = code;
  }
}

/** Thrown when apiKey is missing from provider config. */
export class MissingLlmApiKeyError extends LlmProviderError {
  constructor() {
    super('missing_api_key', 'OpenAI LLM provider requires an apiKey in config');
    this.name = 'MissingLlmApiKeyError';
  }
}

/** Thrown when the provider request exceeds the configured timeout. */
export class LlmProviderTimeoutError extends LlmProviderError {
  constructor(timeoutMs: number) {
    super('timeout', `OpenAI LLM provider request timed out after ${timeoutMs}ms`);
    this.name = 'LlmProviderTimeoutError';
  }
}

/** Thrown when the HTTP response status is not 2xx. */
export class LlmProviderHttpError extends LlmProviderError {
  readonly status: number;

  constructor(status: number, message: string) {
    super('http_error', message);
    this.name = 'LlmProviderHttpError';
    this.status = status;
  }
}

/** Thrown when the response body cannot be parsed or lacks expected fields. */
export class LlmProviderMalformedResponseError extends LlmProviderError {
  constructor(detail: string) {
    super('malformed_response', `OpenAI LLM provider malformed response: ${detail}`);
    this.name = 'LlmProviderMalformedResponseError';
  }
}

/** Thrown when the provider returns no usable text content. */
export class LlmProviderEmptyResponseError extends LlmProviderError {
  constructor() {
    super('empty_response', 'OpenAI LLM provider returned empty output');
    this.name = 'LlmProviderEmptyResponseError';
  }
}
