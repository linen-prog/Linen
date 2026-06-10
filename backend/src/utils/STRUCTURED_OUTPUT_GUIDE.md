# Structured Output Validation Guide

This guide explains how to use the structured output validation utilities for AI-generated content in your backend routes.

## Overview

The `structured-output.ts` module provides type-safe utilities for generating and validating structured data from AI models using Zod schemas. It handles validation errors gracefully and provides fallback mechanisms.

## Core Functions

### `generateStructuredOutput<T>`

Generate structured output from an AI model with automatic Zod validation. Throws on validation failure.

```typescript
import { generateStructuredOutput } from '../utils/structured-output.js';
import { z } from 'zod';
import { gateway } from '@specific-dev/framework';

const schema = z.object({
  title: z.string().min(5).max(200),
  category: z.enum(['prayer', 'meditation', 'reflection']),
});

const result = await generateStructuredOutput({
  schema,
  system: 'You are a spiritual guide...',
  prompt: 'Generate a daily practice invitation.',
  model: gateway('openai/gpt-4o-mini'),
});

// result is typed as { title: string; category: 'prayer' | 'meditation' | 'reflection' }
```

### `safeGenerateStructuredOutput<T>`

Generate structured output with automatic fallback on error. Never throws, always returns a valid value.

```typescript
import { safeGenerateStructuredOutput } from '../utils/structured-output.js';

const result = await safeGenerateStructuredOutput({
  schema,
  system: 'You are a spiritual guide...',
  prompt: 'Generate a daily practice invitation.',
  model: gateway('openai/gpt-4o-mini'),
  fallback: {
    title: 'Quiet Presence',
    category: 'meditation',
  },
  app, // optional, for logging errors
});

// result is guaranteed to be valid - either generated or the fallback
```

## Custom Schemas

### Define Custom Schemas

```typescript
import { createOutputSchema } from '../utils/structured-output.js';
import { z } from 'zod';

const somaticPracticeSchema = createOutputSchema({
  practice: z.string().min(20).max(2000),
  category: z.enum([
    'grounding',
    'orienting',
    'hand_over_heart',
    'gentle_release',
  ]),
  duration: z.string().optional(),
});

type SomaticPractice = z.infer<typeof somaticPracticeSchema>;
```

### Use Common Schema Builders

The `CommonSchemas` object provides pre-built schemas for common patterns:

```typescript
import { CommonSchemas } from '../utils/structured-output.js';

// Text with category
const textSchema = CommonSchemas.textWithCategory(['prayer', 'meditation']);

// Practice with instructions
const practiceSchema = CommonSchemas.practice();

// Analysis with summary and key points
const analysisSchema = CommonSchemas.analysis();

// Reflection with prompt and response
const reflectionSchema = CommonSchemas.reflection();

// List of items
const listSchema = CommonSchemas.itemList(z.object({
  id: z.string(),
  title: z.string(),
}));
```

## Error Handling

### Handling Validation Errors

```typescript
import { generateStructuredOutput, StructuredOutputError, formatValidationError } from '../utils/structured-output.js';

try {
  const result = await generateStructuredOutput({
    schema,
    system: 'You are...',
    prompt: 'Generate...',
    model: gateway('openai/gpt-4o-mini'),
  });
} catch (error) {
  if (error instanceof StructuredOutputError) {
    if (error.validationErrors) {
      const message = formatValidationError(error.validationErrors);
      app.logger.error({ validationError: message }, 'Schema validation failed');
    } else {
      app.logger.error({ err: error.originalError }, error.message);
    }
    return reply.status(500).send({ error: 'Failed to generate content' });
  }
  throw error;
}
```

### Custom Error Messages

```typescript
const result = await generateStructuredOutput({
  schema,
  system: 'You are...',
  prompt: 'Generate...',
  model: gateway('openai/gpt-4o-mini'),
  errorMessage: 'Failed to generate daily somatic practice',
});
```

## Advanced Features

### Batch Generation

Generate multiple structured outputs in parallel:

```typescript
import { batchGenerateStructuredOutput } from '../utils/structured-output.js';

const results = await batchGenerateStructuredOutput(
  [
    { prompt: 'Generate practice 1...', system: 'You are...' },
    { prompt: 'Generate practice 2...', system: 'You are...' },
    { prompt: 'Generate practice 3...', system: 'You are...' },
  ],
  {
    schema,
    model: gateway('openai/gpt-4o-mini'),
  }
);

// results is an array of validated outputs, in the same order
```

### Retry with Backoff

Retry generation with exponential backoff:

```typescript
import { generateStructuredOutputWithRetry } from '../utils/structured-output.js';

const result = await generateStructuredOutputWithRetry(
  {
    schema,
    system: 'You are...',
    prompt: 'Generate...',
    model: gateway('openai/gpt-4o-mini'),
  },
  {
    maxRetries: 3,
    backoffMs: 1000, // 1s, 2s, 4s backoff
  }
);
```

## Real-World Example: Somatic Daily Prompt

Here's how the somatic routes use structured output validation:

```typescript
import { safeGenerateStructuredOutput } from '../utils/structured-output.js';
import { z } from 'zod';
import { gateway } from '@specific-dev/framework';

const SOMATIC_CATEGORIES = [
  'grounding',
  'orienting',
  'hand_over_heart',
  // ... 13 total
] as const;

const SomaticPromptSchema = z.object({
  practice: z.string().min(20).max(2000),
  somaticCategory: z.enum(SOMATIC_CATEGORIES),
});

// In route handler
const result = await safeGenerateStructuredOutput({
  schema: SomaticPromptSchema,
  system: `You are a Christian somatic guide...
  
SOMATIC CATEGORIES (13 total):
- grounding: feet, earth, weight, roots, stability
- orienting: eyes, gaze, turning, awareness of space
...`,
  prompt: 'Generate the somatic practice now...',
  model: gateway('openai/gpt-4o-mini'),
  fallback: {
    practice:
      'EMBODIED INVITATION: Place your hand on your heart. PRACTICE: Feel the warmth there... REST: Your heart is known to God.',
    somaticCategory: 'hand_over_heart',
  },
  app,
});

app.logger.info({ category: result.somaticCategory }, 'Generated somatic practice');
```

## Type Safety

The utilities are fully type-safe with TypeScript:

```typescript
const schema = z.object({
  title: z.string(),
  count: z.number(),
  tags: z.array(z.string()),
});

const result = await generateStructuredOutput({
  schema,
  // ...
});

// TypeScript knows result is: { title: string; count: number; tags: string[] }
result.title.toUpperCase(); // ✅ OK
result.count + 1; // ✅ OK
result.tags.map(t => t); // ✅ OK
result.invalidField; // ❌ TypeScript error: Property 'invalidField' does not exist
```

## Best Practices

### 1. Always Use Fallbacks for User-Facing Content

```typescript
// ❌ BAD: Will crash if generation fails
const result = await generateStructuredOutput({ schema, system, prompt, model });

// ✅ GOOD: Falls back gracefully
const result = await safeGenerateStructuredOutput({
  schema,
  system,
  prompt,
  model,
  fallback: { /* sensible default */ },
  app,
});
```

### 2. Define Schemas Once, Reuse Everywhere

```typescript
// Define at module level
const PracticeSchema = z.object({
  title: z.string().min(5).max(200),
  instructions: z.string().min(20).max(2000),
});

// Use in multiple routes/functions
const practice1 = await generateStructuredOutput({
  schema: PracticeSchema,
  // ...
});

const practice2 = await safeGenerateStructuredOutput({
  schema: PracticeSchema,
  // ...
});
```

### 3. Add Context for Better Logging

```typescript
const result = await safeGenerateStructuredOutput({
  schema,
  system,
  prompt,
  model,
  fallback,
  app,
  context: {
    userId,
    themeTitle,
    liturgicalSeason,
  }, // Helps when debugging errors
});
```

### 4. Craft Detailed System Prompts

The quality of structured output depends heavily on the system prompt:

```typescript
let systemPrompt = `You are a Christian somatic guide creating embodied spiritual practices.

IMPORTANT RULES:
1. Always include a 3-section structure:
   - EMBODIED INVITATION: Opening (1-2 sentences)
   - PRACTICE: Instructions (2-4 sentences)
   - REST IN GOD'S PRESENCE: Closing (1-2 sentences)
2. Do NOT start with breath work
3. Map spiritual truths to specific body parts
4. Tone: Warm, gentle, spiritually grounded

${/* Add examples, categories, context */}`;

const result = await safeGenerateStructuredOutput({
  schema: SomaticPromptSchema,
  system: systemPrompt,
  prompt: 'Generate the somatic practice now using the exact 3-section structure.',
  model: gateway('openai/gpt-4o-mini'),
  fallback: defaultPractice,
  app,
});
```

### 5. Handle Enum Constraints Properly

```typescript
// In Zod schema
const schema = z.object({
  category: z.enum(['prayer', 'meditation', 'reflection']),
});

// In OpenAPI schema (for route documentation)
{
  schema: {
    body: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['prayer', 'meditation', 'reflection'], // Must match Zod
        },
      },
    },
  },
}
```

## Troubleshooting

### "Validation failed" Errors

The AI model returned data that doesn't match your Zod schema. Check:

1. **Schema constraints**: Are min/max lengths, enum values correct?
2. **System prompt**: Does it clearly explain the expected format?
3. **Model capability**: Is the model capable of the task? (Use gpt-4o-mini or better)

### Performance Issues

For slow generations:

1. Use `batchGenerateStructuredOutput` for parallel processing
2. Consider caching results (like somatic routes do with `user_somatic_prompts`)
3. Use fallbacks to fail fast on errors

### Type Errors

If you see type errors:

```typescript
// Make sure to infer types correctly
type PracticeOutput = z.infer<typeof PracticeSchema>;

const result: PracticeOutput = await generateStructuredOutput({
  schema: PracticeSchema,
  // ...
});
```

## Testing

```typescript
import { generateStructuredOutput } from '../utils/structured-output.js';

describe('Structured Output', () => {
  it('generates valid practice output', async () => {
    const result = await generateStructuredOutput({
      schema: PracticeSchema,
      system: 'You are a guide...',
      prompt: 'Generate a practice...',
      model: gateway('openai/gpt-4o-mini'),
    });

    expect(result.title).toBeDefined();
    expect(result.instructions.length).toBeGreaterThan(20);
  });

  it('falls back on validation error', async () => {
    const fallback = { title: 'Default', instructions: 'Default instructions' };
    const result = await safeGenerateStructuredOutput({
      schema: PracticeSchema,
      system: 'Invalid system prompt',
      prompt: 'Generate...',
      model: gateway('openai/gpt-4o-mini'),
      fallback,
    });

    expect(result).toEqual(fallback); // Should use fallback
  });
});
```
