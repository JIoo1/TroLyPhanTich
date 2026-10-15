import { z } from 'zod';

// This is the WF02 chat contract currently documented by the project owner.
// Replace/adjust it only after inspecting a successful real workflow response.
const requirementSchema = z
  .object({
    code: z.string().optional(),
    requirement_code: z.string().optional(),
    category: z.string().nullable().optional(),
    content: z.string(),
    source: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    confidence: z.number().nullable().optional(),
    actor: z.string().nullable().optional(),
    evidence: z.string().nullable().optional(),
  })
  .refine(
    (value) => Boolean(value.code || value.requirement_code),
    'Requirement must include a code.',
  );

export const chatTurnSchema = z
  .object({
    success: z.boolean(),
    persist: z.boolean(),
    response: z.string(),
    suggestions: z.array(z.string()),
    next_question: z.union([
      z.string(),
      z
        .object({ question: z.string().nullable(), suggestions: z.array(z.string()).optional() })
        .passthrough(),
      z.null(),
    ]),
    new_requirements: z.array(requirementSchema),
    requirements_state: z.unknown(),
    stage: z.string().optional(),
    progress: z.object({ stage: z.string().optional() }).passthrough().optional(),
    completion: z.number().min(0).max(100),
    ready_for_report: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!Object.hasOwn(value, 'requirements_state'))
      context.addIssue({
        code: 'custom',
        path: ['requirements_state'],
        message: 'Required field is missing.',
      });
    if (value.success && !Object.hasOwn(value, 'ready_for_report'))
      context.addIssue({
        code: 'custom',
        path: ['ready_for_report'],
        message: 'Successful chat result must include this field.',
      });
  });

export function validateChatTurn(value) {
  const result = chatTurnSchema.safeParse(value);
  if (!result.success) return { success: false, error: result.error.flatten() };
  const codes = result.data.new_requirements.map((item) => item.code || item.requirement_code);
  if (new Set(codes).size !== codes.length)
    return {
      success: false,
      error: { formErrors: ['Duplicate requirement_code in one response.'], fieldErrors: {} },
    };
  return { success: true, data: result.data };
}
