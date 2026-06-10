# Structured AI Output Validation Utilities

## Quick Start

```typescript
import { safeGenerateStructuredOutput } from '../utils/structured-output.js';
import { z } from 'zod';
import { gateway } from '@specific-dev/framework';

// Define your schema
const schema = z.object({
  practice: z.string().min(20).max(2000),
  category: z.enum(['grounding', 'breathing', 'movement']),
});

// Generate with automatic fallback
const result = await safeGenerateStructuredOutput({
  schema,
  system: 'You are a somatic guide...',
  prompt: 'Generate a practice...',
  model: gateway('openai/gpt-4o-mini'),
  fallback: {
    practice: 'Default practice text',
    category: 'grounding',
  },
  app, // optional, for logging
});

// result is guaranteed to be valid
console.log(result.practice); // ✅ Always safe
```

## Available Functions

### Core Functions

1. **`generateStructuredOutput<T>`** - Throws on error
   - Use when you need error handling
   - Validates against Zod schema
   - Type-safe return value

2. **`safeGenerateStructuredOutput<T>`** - Never throws
   - Use for user-facing content
   - Always returns valid value (generated or fallback)
   - Logs errors automatically

3. **`batchGenerateStructuredOutput<T>`** - Parallel generation
   - Generate multiple outputs at once
   - Processes in parallel for speed
   - Returns array in same order

4. **`generateStructuredOutputWithRetry<T>`** - Automatic retry
   - Retries up to 3 times with exponential backoff
   - Useful for flaky APIs
   - Configurable retry options

### Helper Functions

- **`createOutputSchema<T>`** - Create Zod schemas programmatically
- **`extractValidatedData<T>`** - Manual validation
- **`formatValidationError`** - Pretty-print Zod errors
- **`CommonSchemas`** - Pre-built schemas for common patterns

## Pre-Built Schemas

```typescript
import { CommonSchemas } from '../utils/structured-output.js';

// Text with category
CommonSchemas.textWithCategory(['option1', 'option2'])

// Practice with instructions
CommonSchemas.practice()

// Analysis with summary and key points
CommonSchemas.analysis()

// Reflection with prompt and response
CommonSchemas.reflection()

// List of items
CommonSchemas.itemList(itemSchema)
```

## Error Handling

```typescript
import { StructuredOutputError, formatValidationError } from '../utils/structured-output.js';

try {
  const result = await generateStructuredOutput({ schema, system, prompt, model });
} catch (error) {
  if (error instanceof StructuredOutputError) {
    if (error.validationErrors) {
      console.error(formatValidationError(error.validationErrors));
    } else {
      console.error(error.message);
    }
  }
}
```

## Real Example: Somatic Routes

```typescript
import { safeGenerateStructuredOutput } from '../utils/structured-output.js';

const SomaticPromptSchema = z.object({
  practice: z.string().min(20).max(2000),
  somaticCategory: z.enum(SOMATIC_CATEGORIES),
});

// In route handler
const result = await safeGenerateStructuredOutput({
  schema: SomaticPromptSchema,
  system: systemPrompt, // Your detailed system prompt
  prompt: 'Generate the somatic practice now...',
  model: gateway('openai/gpt-4o-mini'),
  fallback: {
    practice: 'Place your hand on your heart. Feel the warmth...',
    somaticCategory: 'hand_over_heart',
  },
  app,
});

return reply.send({
  somatic_prompt: result.practice,
  category: result.somaticCategory,
  cached: false,
});
```

## File Structure

- **`structured-output.ts`** - Main utility module (400+ lines)
  - Type-safe functions for AI output generation
  - Comprehensive error handling
  - Retry logic and batch processing
  - Pre-built schema builders

- **`STRUCTURED_OUTPUT_GUIDE.md`** - Comprehensive guide
  - Detailed API documentation
  - Real-world examples
  - Best practices
  - Troubleshooting tips

- **`STRUCTURED_OUTPUT_README.md`** - This file
  - Quick reference
  - API overview
  - Common usage patterns

## Key Features

✅ **Type-Safe**: Full TypeScript support with Zod type inference  
✅ **Error Handling**: Custom StructuredOutputError class with detailed info  
✅ **Fallbacks**: Safe mode that never throws  
✅ **Batch Processing**: Generate multiple outputs in parallel  
✅ **Retry Logic**: Automatic retry with exponential backoff  
✅ **Logging**: Integrated with app.logger  
✅ **Schema Builders**: Common patterns pre-built  
✅ **Well Documented**: Extensive JSDoc comments and guides  

## Integration with Existing Routes

The utilities are already used in:
- `src/routes/somatic.ts` - Daily somatic prompt generation with `generateObject`

To use in other routes:
1. Import the function you need
2. Define your Zod schema
3. Call with system/prompt/model
4. Type inference handles the rest

## Performance Considerations

- **Caching**: Like somatic routes, cache generated outputs per user per day
- **Batch Generation**: Use `batchGenerateStructuredOutput` for multiple items
- **Retry Strategy**: Use `generateStructuredOutputWithRetry` for unreliable APIs
- **Fallbacks**: Always provide sensible defaults for user-facing content

## Next Steps

1. Use `safeGenerateStructuredOutput` for new AI features
2. Define clear Zod schemas that match your AI output
3. Craft detailed system prompts with examples
4. Add appropriate logging with `context` parameter
5. Cache results when applicable (daily prompts, summaries, etc.)

## Questions?

See `STRUCTURED_OUTPUT_GUIDE.md` for comprehensive documentation with examples for every feature.
