import { z } from 'zod';

/**
 * Example schema demonstrating the shared-validation pattern (Task 1.4).
 * It validates a dummy payload on POST /example/echo to prove the pattern
 * works. Real domain schemas (news, leaders, companies, ...) replace this
 * in later phases.
 */
export const exampleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email('A valid email address is required'),
  age: z.number().int().min(0).max(120).optional(),
});
