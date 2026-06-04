import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireRole } from "@/lib/rbac";
import { withErrorHandler, parseJSON } from "@/lib/error-handler";
import { checkRateLimit } from "@/lib/rateLimit";
import { AppError } from "@/lib/errors";
import { connectDb } from "@/lib/mongodb";
import { publishNoticeToRedis } from "@/app/api/notices/stream/route";
import { createNoticeSchema } from "@/lib/validations/notices";
import { validateRequest } from "@/lib/validations/validateRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Valid roles in Learnova — used to validate targetAudience entries
const VALID_ROLES = ["student", "teacher", "institute", "admin", "staff"] as const;

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.enum([
    "academic",
    "administrative",
    "financial",
    "general",
    "technical",
    "all",
  ]),
  priority: z.enum(["low", "medium", "high"]),
  isPinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),

  /**
   * Audience Targeting (feat #2184)
   * ─────────────────────────────────
   * Array of role strings that should receive this notice.
   * FirestoreContext queries notices where targetAudience
   * array-contains the current user's role, so only relevant
   * notices appear for each user.
   *
   * Examples:
   *   ["student", "teacher"]  → visible to students and teachers only
   *   ["student", "teacher", "institute", "admin"] → broadcast to all
   *
   * The creator selects the audience in NoticeForm.jsx.
   * Each value must be one of the VALID_ROLES above.
   */
  targetAudience: z
    .array(z.enum(["student", "teacher", "institute", "admin", "staff"]))
    .min(1, "Select at least one target audience role")
    .max(5, "Too many audience roles"),
});

async function publishNotice(request) {
  const allowedRoles = ["teacher", "admin", "staff"];
  const { payload: decodedToken, profile } = await requireRole(
    request,
    allowedRoles
  );

  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimitResult = await checkRateLimit(
    `publish_notice_${ip}_${decodedToken.uid}`
  );
  if (!rateLimitResult.allowed) {
    throw new AppError("Too many attempts. Please try again later.", 429);
  }

  const validationResult = await validateRequest(request, createNoticeSchema, 1024 * 50);
  if (!validationResult.success) {
    return validationResult.response;
  }
  const validData = validationResult.data;

  const adminDb = getAdminDb();
  const instituteId = profile.instituteId || null;

  const newNotice = {
    ...validData,
    author: decodedToken.name || decodedToken.email.split("@")[0],
    authorId: decodedToken.uid,
    authorRole: profile.role,
    instituteId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await adminDb.collection("notices").add(newNotice);

  // Sync to MongoDB for SSE Change Stream support
  try {
    const mongoDb = await connectDb();
    await mongoDb.collection("notices").insertOne({
      ...newNotice,
      _id: result.id,
    });
  } catch (mongoError) {
    console.error("Failed to sync notice to MongoDB:", mongoError);
  }

  return NextResponse.json({
    success: true,
    notice: { id: result.id, ...newNotice },
  });
}

export const POST = withErrorHandler(publishNotice);
