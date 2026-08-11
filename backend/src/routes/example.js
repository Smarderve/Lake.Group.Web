import { Router } from 'express';
import { exampleSchema } from '../validators/example.js';

/**
 * POST /example/echo — validation pattern demo (Task 1.4).
 *
 * Proves the shared-validation pattern end to end on a dummy payload:
 *   - invalid body  -> 400 with { error: { code: "VALIDATION_ERROR", details: [...] } }
 *   - valid body    -> 200 with { received: <validated data> }
 *
 * Not tied to any real domain yet.
 */
export function exampleRouter() {
  const router = Router();

  router.post('/echo', (req, res) => {
    const result = exampleSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body failed validation',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.') || '(root)',
            message: issue.message,
          })),
        },
      });
    }

    res.status(200).json({ received: result.data });
  });

  return router;
}
