import { z } from "zod";

export const sexSchema = z.enum(["male", "female"]);
export const sportSchema = z.enum(["futbol5", "futbol7"]);
export const audienceSchema = z.enum(["mixed", "men", "women"]);
export const voteSchema = z.enum(["yes", "no"]);

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD");

export const approxDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "approxDate must be YYYY-MM-DD");

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
  sex: sexSchema,
  birthDate: birthDateSchema,
  sports: z.array(sportSchema).min(1),
  zoneId: z.string().min(1),
  photoUrl: z.string().url().nullable().optional(),
});

export const patchMeSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  sports: z.array(sportSchema).min(1).optional(),
  zoneId: z.string().min(1).optional(),
  photoUrl: z.string().url().nullable().optional(),
});

export const avatarSchema = z.object({
  photoUrl: z.string().url(),
});

export const createZoneSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  department: z.string().min(1).max(120),
  active: z.boolean().optional().default(true),
});

export const updateZoneSchema = createZoneSchema.partial();

export const createEventSchema = z.object({
  sport: sportSchema,
  audience: audienceSchema,
  zoneId: z.string().min(1),
  approxDate: approxDateSchema,
  startsAt: z.string().datetime().nullable().optional(),
  venueText: z.string().max(200).nullable().optional(),
});

export const publishEventSchema = z.object({
  // publish uses existing fields; optional overrides allowed
  approxDate: approxDateSchema.optional(),
  startsAt: z.string().datetime().nullable().optional(),
  venueText: z.string().max(200).nullable().optional(),
});

export const postponeEventSchema = z.object({
  approxDate: approxDateSchema,
  startsAt: z.string().datetime().nullable().optional(),
});

export const joinInviteSchema = z.object({
  inviteCode: z.string().min(4).max(32),
});

export const decideJoinSchema = z.object({
  decision: z.enum(["accept", "reject"]),
});

export const voteBodySchema = z.object({
  value: voteSchema,
});

export const messageBodySchema = z.object({
  body: z.string().min(1).max(2000),
});

export const reportSchema = z.object({
  targetType: z.enum(["user", "event", "message"]),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(1000),
});

export const banUserSchema = z.object({
  status: z.enum(["active", "banned"]),
});

export const resolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
});
