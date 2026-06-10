import type { App } from '../index.js';
import { z, ZodSchema, ZodError } from 'zod';
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';

/**
 * Error type for structured output validation failures
 */
export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: ZodError,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StructuredOutputError';
  }
}

/**
 * Options for generating structured output
 */
export interface GenerateStructuredOutputOptions<T extends ZodSchema> {
  /** The Zod schema to validate against */
  schema: T;
  /** System prompt for the AI model */
  system: string;
  /** User prompt for the AI model */
  prompt: string;
  /** The language model to use (e.g., gateway('openai/gpt-4o-mini')) */
  model: LanguageModel;
  /** Optional logging context */
  context?: Record<string, unknown>;
  /** Optional custom error message */
  errorMessage?: string;
}

/**
 * Options for safe structured output generation with fallback
 */
export interface SafeGenerateStructuredOutputOptions<T extends ZodSchema>
  extends GenerateStructuredOutputOptions<T> {
  /** Fallback value to return on error */
  fallback: z.infer<T>;
  /** Logger instance (for logging errors) */
  app?: App;
}

/**
 * Generate structured output from an AI model with Zod validation
 *
 * @param options Configuration object
 * @returns Validated object matching the Zod schema type
 * @throws StructuredOutputError if validation fails
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   title: z.string(),
 *   category: z.enum(['prayer', 'meditation', 'reflection']),
 * });
 *
 * const result = await generateStructuredOutput({
 *   schema,
 *   system: 'You are a spiritual guide...',
 *   prompt: 'Generate a daily practice...',
 *   model: gateway('openai/gpt-4o-mini'),
 * });
 *
 * // result is typed as { title: string; category: 'prayer' | 'meditation' | 'reflection' }
 * ```
 */
export async function generateStructuredOutput<T extends ZodSchema>(
  options: GenerateStructuredOutputOptions<T>
): Promise<z.infer<T>> {
  const { schema, system, prompt, model, context, errorMessage } = options;

  try {
    const result = await generateObject({
      model,
      system,
      prompt,
      schema: schema as any,
    });

    return result.object as z.infer<T>;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StructuredOutputError(
        errorMessage || 'Structured output validation failed',
        error,
        error instanceof Error ? error : undefined
      );
    }

    throw new StructuredOutputError(
      errorMessage || 'Failed to generate structured output',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Generate structured output with automatic fallback on error
 * Always returns a valid value - never throws
 *
 * @param options Configuration object including fallback value
 * @returns Validated object or fallback value on error
 *
 * @example
 * ```typescript
 * const result = await safeGenerateStructuredOutput({
 *   schema: zodSchema,
 *   system: 'You are...',
 *   prompt: 'Generate...',
 *   model: gateway('openai/gpt-4o-mini'),
 *   fallback: { title: 'Default', category: 'prayer' },
 *   app, // optional, for logging
 * });
 *
 * // result is always valid - either generated or fallback
 * ```
 */
export async function safeGenerateStructuredOutput<T extends ZodSchema>(
  options: SafeGenerateStructuredOutputOptions<T>
): Promise<z.infer<T>> {
  const { app, context, errorMessage, fallback } = options;

  try {
    return await generateStructuredOutput(options);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (app) {
      app.logger.warn(
        { context, error: errorMsg },
        errorMessage || 'Structured output generation failed, using fallback'
      );
    }

    return fallback;
  }
}

/**
 * Create a reusable schema validator for common AI output patterns
 *
 * @example
 * ```typescript
 * const somaticSchema = createOutputSchema({
 *   practice: z.string().min(20).max(2000),
 *   category: z.enum(['grounding', 'breathing', 'movement']),
 * });
 *
 * const result = await generateStructuredOutput({
 *   schema: somaticSchema,
 *   // ...
 * });
 * ```
 */
export function createOutputSchema<T extends Record<string, ZodSchema>>(fields: T) {
  return z.object(fields);
}

/**
 * Common schema builders for frequently used AI output patterns
 */
export const CommonSchemas = {
  /**
   * Single text output with optional category
   */
  textWithCategory: (categoryOptions: [string, ...string[]]) =>
    z.object({
      text: z.string().min(1).max(10000),
      category: z.enum(categoryOptions),
    }),

  /**
   * Structured practice with title and instructions
   */
  practice: () =>
    z.object({
      title: z.string().min(5).max(200),
      instructions: z.string().min(20).max(2000),
      duration: z.string().min(2).max(50).optional(),
      category: z.string(),
    }),

  /**
   * Analysis with summary and key points
   */
  analysis: () =>
    z.object({
      summary: z.string().min(10).max(1000),
      keyPoints: z.array(z.string().min(5).max(500)).min(1).max(10),
      conclusion: z.string().min(10).max(500).optional(),
    }),

  /**
   * Structured reflection with prompt and response
   */
  reflection: () =>
    z.object({
      prompt: z.string().min(10).max(500),
      response: z.string().min(20).max(2000),
      category: z.string().optional(),
    }),

  /**
   * Multiple items in a structured list
   */
  itemList: (itemSchema: ZodSchema) =>
    z.object({
      items: z.array(itemSchema).min(1).max(50),
      title: z.string().min(2).max(200).optional(),
    }),
};

/**
 * Utility to format ZodError into a human-readable message
 *
 * @example
 * ```typescript
 * try {
 *   const result = await generateStructuredOutput({...});
 * } catch (error) {
 *   if (error instanceof StructuredOutputError && error.validationErrors) {
 *     const message = formatValidationError(error.validationErrors);
 *     console.error(message);
 *   }
 * }
 * ```
 */
export function formatValidationError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path || 'root'}: ${issue.message}`;
  });

  return `Validation failed:\n${issues.join('\n')}`;
}

/**
 * Type-safe helper to extract validated data with type inference
 *
 * @example
 * ```typescript
 * const schema = z.object({ title: z.string(), count: z.number() });
 * type Output = z.infer<typeof schema>;
 *
 * const result = await generateStructuredOutput<typeof schema>({...});
 * // result is properly typed as { title: string; count: number }
 * ```
 */
export function extractValidatedData<T extends ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Batch generate multiple structured outputs efficiently
 * Processes all in parallel and returns results in order
 *
 * @example
 * ```typescript
 * const results = await batchGenerateStructuredOutput(
 *   [
 *     { prompt: 'Generate practice 1...', system: 'You are...' },
 *     { prompt: 'Generate practice 2...', system: 'You are...' },
 *   ],
 *   {
 *     schema: practiceSchema,
 *     model: gateway('openai/gpt-4o-mini'),
 *   }
 * );
 *
 * // results is an array of validated outputs
 * ```
 */
export async function batchGenerateStructuredOutput<T extends ZodSchema>(
  prompts: Array<{ prompt: string; system: string }>,
  commonOptions: Omit<GenerateStructuredOutputOptions<T>, 'prompt' | 'system'>
): Promise<z.infer<T>[]> {
  const results = await Promise.all(
    prompts.map((p) =>
      generateStructuredOutput({
        ...commonOptions,
        prompt: p.prompt,
        system: p.system,
      })
    )
  );

  return results;
}

/**
 * Retry logic for structured output generation
 * Useful when API calls are flaky or need multiple attempts
 *
 * @example
 * ```typescript
 * const result = await generateStructuredOutputWithRetry(
 *   {
 *     schema,
 *     system: 'You are...',
 *     prompt: 'Generate...',
 *     model: gateway('openai/gpt-4o-mini'),
 *   },
 *   { maxRetries: 3, backoffMs: 1000 }
 * );
 * ```
 */
export async function generateStructuredOutputWithRetry<T extends ZodSchema>(
  options: GenerateStructuredOutputOptions<T>,
  retryOptions?: { maxRetries?: number; backoffMs?: number }
): Promise<z.infer<T>> {
  const maxRetries = retryOptions?.maxRetries ?? 3;
  const backoffMs = retryOptions?.backoffMs ?? 1000;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateStructuredOutput(options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new StructuredOutputError('All retry attempts failed');
}
