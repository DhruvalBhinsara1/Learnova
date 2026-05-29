import { jsonError, jsonSuccess } from "@/lib/api-response";
import { withErrorHandler } from "@/lib/error-handler";
import { requireAdmin } from "@/lib/rbac";
import { AppError } from "@/lib/errors";
import admin from "firebase-admin";
import { connectDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request) => {
  const { payload: decodedToken } = await requireAdmin(request);

  const { uid } = await request.json();
  if (!uid || typeof uid !== "string") {
    return jsonError("Firebase UID is required", 400);
  }

  const db = admin.firestore();
  const mongoDB = await connectDb();

  const firestoreDoc = await db.collection("users").doc(uid).get();
  const hasFirestore = firestoreDoc.exists;
  const firestoreData = hasFirestore ? firestoreDoc.data() : null;

  const mongoUser = await mongoDB.collection("users").findOne({ firebaseUid: uid });
  const hasMongo = !!mongoUser;

  if (hasFirestore && hasMongo) {
    return jsonSuccess({
      message: "User already exists in both databases",
      firestore: true,
      mongo: true,
    });
  }

  const actions = [];

  if (!hasFirestore && mongoUser) {
    const profile = {
      uid: mongoUser.firebaseUid,
      email: mongoUser.email || "",
      fullName: mongoUser.name || mongoUser.fullName || "",
      role: mongoUser.role || "student",
      createdAt: mongoUser.createdAt || new Date().toISOString(),
      lastLogin: mongoUser.lastLogin || null,
    };
    await db.collection("users").doc(uid).set(profile, { merge: true });
    actions.push("firestore_profile_created");
  }

  if (!hasMongo && firestoreData) {
    const now = new Date().toISOString();
    await mongoDB.collection("users").updateOne(
      { firebaseUid: uid },
      {
        $set: {
          firebaseUid: uid,
          email: firestoreData.email || "",
          name: firestoreData.fullName || "",
          fullName: firestoreData.fullName || "",
          role: firestoreData.role || "student",
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
    actions.push("mongo_document_created");
  }

  if (actions.length === 0) {
    return jsonError("User not found in either database", 404);
  }

  return jsonSuccess({
    message: "User reconciled successfully",
    actions,
    firestore: true,
    mongo: true,
  });
});
