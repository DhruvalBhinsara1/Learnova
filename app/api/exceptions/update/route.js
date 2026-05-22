import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken, getUserProfile, getUserProfileByEmail } from "@/lib/firebase-admin";
import { ObjectId } from "mongodb";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { NextResponse } from "next/server";
import xss from "xss";

export async function PUT(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];

    const authResult = await verifyFirebaseToken(token);

    if (!authResult.valid) {
      return jsonError("Unauthorized", 401);
    }

    const decodedToken = authResult.decodedToken;

    // Fetch user profile from Firestore to get the user's role
    const profile = await getUserProfile(decodedToken.uid);

    if (!profile) {
      return jsonError("User profile not found", 404);
    }

    // Restrict access to admin and teacher roles only (return 403 Forbidden otherwise)
    if (profile.role !== "admin" && profile.role !== "teacher") {
      return jsonError("Forbidden", 403);
    }

    const body = await request.json();
    const { exceptionId, status, comments } = body;
    const sanitizedComments = typeof comments === "string" ? xss(comments).trim() : "";

    if (!exceptionId) {
      return jsonError("exceptionId is required", 400);
    }

    if (!ObjectId.isValid(exceptionId)) {
      return jsonError("Invalid exception ID", 400);
    }

    const trimmedStatus = typeof status === "string" ? status.trim() : "";
    const allowedStatuses = ["approved", "rejected"];
    if (!allowedStatuses.includes(trimmedStatus)) {
      return jsonError("Invalid status value", 400);
    }

    const db = await connectDb();

    // Fetch the exception to perform ownership/relationship checks to prevent IDOR
    const exception = await db.collection("exceptions").findOne({ _id: new ObjectId(exceptionId) });

    if (!exception) {
      return jsonError("Exception not found", 404);
    }

    // Perform teacher-specific assignment validation (CWE-639 resolution)
    if (profile.role === "teacher") {
      const teacherSubjects = profile.subjects || [];
      const exceptionClass = exception.className || exception.class;
      let isAuthorized = false;

      // 1. Check if the teacher teaches the class of the exception
      if (exceptionClass && teacherSubjects.includes(exceptionClass)) {
        isAuthorized = true;
      }

      // 2. Fallback: Check student-teacher subject assignment overlap
      if (!isAuthorized && exception.studentEmail) {
        const studentProfile = await getUserProfileByEmail(exception.studentEmail);
        if (studentProfile) {
          const studentSubjects = studentProfile.subjects || studentProfile.classes || [];
          const hasOverlap = studentSubjects.some((subject) => teacherSubjects.includes(subject));
          if (hasOverlap) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return jsonError("Forbidden: You are not authorized to update exception requests for this class/student.", 403);
      }
    }

    const result = await db.collection("exceptions").updateOne(
      { _id: new ObjectId(exceptionId) },
      {
        $set: {
          status: trimmedStatus,
          comments: sanitizedComments,
          reviewedBy: decodedToken.email,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return jsonError("Exception not found", 404);
    }

    return jsonSuccess(
      {
        message: "Exception updated successfully",
      },
      200,
    );
  } catch (error) {
    return jsonError("Internal server error", 500);
  }
}

