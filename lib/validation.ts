import { z } from "zod";

export const emailSchema = z.string().email().max(320);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
});

export const noteTypeSchema = z.enum(["NOTE", "SECRET", "COMMAND", "FILE"]);

export const secretPayloadSchema = z.object({
  username: z.string().max(500).optional(),
  password: z.string().max(2000).optional(),
  url: z.string().max(2000).optional(),
  notes: z.string().max(10_000).optional(),
});

export type SecretPayload = z.infer<typeof secretPayloadSchema>;

export const noteCreateSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  content: z.string().max(500_000).optional().default(""),
  type: noteTypeSchema.optional().default("NOTE"),
  categoryId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).optional(),
  secretPayload: secretPayloadSchema.optional(),
});

export const noteUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  content: z.string().max(500_000).optional(),
  type: noteTypeSchema.optional(),
  categoryId: z.string().uuid().optional(),
  isFavorite: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  secretPayload: secretPayloadSchema.optional(),
});
