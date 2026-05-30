import { jsonError, jsonSuccess } from "@/lib/api-response";
import { withErrorHandler, authenticateRequest } from "@/lib/error-handler";
import { initializeFirebase } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { AppError } from "@/lib/errors";
import admin from "firebase-admin";
import { connectDb } from "@/lib/mongodb";

import { withValidation } from "@/lib/validations/withValidation";
import { setRoleSchema } from "@/lib/validations/auth";

export const POST = withValidation(
  setRoleSchema,
  withErrorHandler(async (request, data) => {
    const decodedToken = await authenticateRequest(request);

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitResult = await checkRateLimit(`set_role_${ip}_${decodedToken.uid}`);
    if (!rateLimitResult.allowed) {
      throw new AppError("Too many attempts. Please try again later.", 429);
    }

    const { role, fullName, instituteName, inviteCode } = data;

    // --- Privilege Escalation Fix: Enforce Invite Codes for Elevated Roles ---
    if (role === "teacher") {
      const expectedCode = process.env.TEACHER_INVITE_CODE;
      if (!expectedCode || inviteCode !== expectedCode) {
        return jsonError("Forbidden: Invalid or missing teacher invite code.", 403);
      }
    } else if (role === "institute") {
      const expectedCode = process.env.INSTITUTE_INVITE_CODE;
      if (!expectedCode || inviteCode !== expectedCode) {
        return jsonError("Forbidden: Invalid or missing institute invite code.", 403);
      }
    }
    // ------------------------------------------------------------------------

    initializeFirebase();
    const db = admin.firestore();

    // Prevent privilege escalation
    const existingProfile = await db
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (existingProfile.exists) {
      const existingRole = existingProfile.data()?.role;

      if (existingRole) {
        return jsonError(
          `Forbidden: Account is already registered as "${existingRole}". Role cannot be changed.`,
          403
        );
      }
    } else if (decodedToken.role) {
      return jsonError(
        `Forbidden: Token already carries role "${decodedToken.role}". Role cannot be changed.`,
        403
      );
    }

    await admin.auth().setCustomUserClaims(decodedToken.uid, {
      role,
    });

    const userProfile = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      fullName,
      role,
      createdAt: new Date().toISOString(),
      emailVerified: decodedToken.email_verified || false,
      lastLogin: new Date().toISOString(),
    };

    if (role === "institute" && instituteName) {
      userProfile.instituteName = instituteName;
    }

    await db
      .collection("users")
      .doc(decodedToken.uid)
      .set(userProfile, { merge: true });

    // Sync user to MongoDB so gamification (awardXp) and biometric labels
    // endpoints can locate the student by their Firebase UID.
    const MAX_MONGO_RETRIES = 3;
    const RETRY_BASE_DELAY_MS = 500;

    for (let attempt = 1; attempt <= MAX_MONGO_RETRIES; attempt++) {
      try {
        const mongoDB = await connectDb();
        const now = new Date().toISOString();

        await mongoDB.collection("users").updateOne(
          { firebaseUid: decodedToken.uid },
          {
            $set: {
              firebaseUid: decodedToken.uid,
              email: decodedToken.email,
              name: fullName,
              fullName,
              role,
              lastLogin: now,
            },
            $setOnInsert: {
              totalXp: 0,
              currentLevel: 1,
              xpToNextLevel: 100,
              currentStreak: 0,
              unlockedBadges: [],
              attendanceHistory: [],
              createdAt: now,
            },
          },
          { upsert: true }
        );
        break;
      } catch (mongoErr) {
        if (attempt === MAX_MONGO_RETRIES) {
          console.error("[set-role] MongoDB sync failed after", MAX_MONGO_RETRIES, "attempts:", mongoErr.message);
          // Roll back Firestore profile and auth claims so the user is not left
          // in a partial state (Firestore exists, MongoDB missing).
          try {
            await db.collection("users").doc(decodedToken.uid).delete();
            await admin.auth().setCustomUserClaims(decodedToken.uid, {});
          } catch (rollbackErr) {
            console.error("[set-role] Rollback failed:", rollbackErr.message);
          }
          return jsonError("Account setup failed due to a server error. Please try again.", 500);
        }
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn("[set-role] MongoDB sync attempt", attempt, "failed, retrying in", delay, "ms:", mongoErr.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return jsonSuccess({ userProfile }, 201);
  }),
  { maxBytes: 1024 * 10 }
);
