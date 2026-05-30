import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDb } from "@/lib/mongodb";
import { extractImageFileFromFormData } from "@/lib/images/imagesService";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const POST = async (request) => {
  try {
    console.log("Avatar upload endpoint called");
    
    const decodedToken = await requireAuth(request);
    console.log("User authenticated:", decodedToken.uid);
    
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    const rateLimitResult = await checkRateLimit(
      `avatar_upload_${ip}_${decodedToken.uid}`
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    console.log("Extracting form data...");
    const formData = await request.formData();
    const file = extractImageFileFromFormData(formData);

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("File received:", file.name, file.size, file.type);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Convert file to base64
    console.log("Converting file to base64...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    console.log("Data URL created, saving to database...");

    // Save to MongoDB users collection
    const db = await connectDb();
    const usersCollection = db.collection("users");
    
    await usersCollection.updateOne(
      { firebaseUid: decodedToken.uid },
      { $set: { avatar: dataUrl } }
    );

    console.log("Avatar saved successfully to database");
    
    return NextResponse.json(
      { 
        success: true, 
        url: dataUrl,
        message: "Avatar uploaded successfully" 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Avatar upload error:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Return specific error messages
    if (error.message && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (error.message && error.message.includes("File size")) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    if (error.message && error.message.includes("Invalid image")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
};
