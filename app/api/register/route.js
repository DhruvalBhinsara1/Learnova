import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

import { connectDb } from "@/lib/mongodb";
import { jsonSuccess, jsonError } from "@/lib/api-response";

import {
  withErrorHandler,
  authenticateRequest,
} from "@/lib/error-handler";

import {
  AppError,
  ValidationError,
  ForbiddenError,
} from "@/lib/errors";

if (typeof global !== "undefined" && !global.mockFile) {
  global.mockFile = {
    size: 1024,
    type: "image/jpeg",
    arrayBuffer: async () =>
      new ArrayBuffer(1024),
  };
}

export const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW =
  60 * 1000;

const MAX_ATTEMPTS = 5;

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Magic bytes validation
 */

const MAGIC_BYTES = {
  "image/jpeg": [
    0xff,
    0xd8,
    0xff,
  ],

  "image/png": [
    0x89,
    0x50,
    0x4e,
    0x47,
  ],

  "image/webp": [
    0x52,
    0x49,
    0x46,
    0x46,
  ],
};

const WEBP_MARKER = [
  0x57,
  0x45,
  0x42,
  0x50,
];

const normalizeText = (
  value
) =>
  typeof value === "string"
    ? value.trim()
    : "";

const getImageExtension = (
  mimeType
) => {
  switch (mimeType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/jpeg":
    default:
      return "jpg";
  }
};

const validateMagicBytes = (
  buffer,
  mimeType
) => {
  const magic =
    MAGIC_BYTES[mimeType];

  if (
    !magic ||
    buffer.length < magic.length
  ) {
    return false;
  }

  for (
    let i = 0;
    i < magic.length;
    i++
  ) {
    if (buffer[i] !== magic[i]) {
      return false;
    }
  }

  if (
    mimeType === "image/webp"
  ) {
    if (buffer.length < 12) {
      return false;
    }

    for (
      let i = 0;
      i < WEBP_MARKER.length;
      i++
    ) {
      if (
        buffer[8 + i] !==
        WEBP_MARKER[i]
      ) {
        return false;
      }
    }
  }

  return true;
};

export const POST =
  withErrorHandler(
    async (req) => {
      // Rate limiting
      const ip =
        req.headers.get(
          "x-forwarded-for"
        ) || "127.0.0.1";

      const now = Date.now();

      if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
      }

      const attempts =
        rateLimitMap
          .get(ip)
          .filter(
            (timestamp) =>
              now - timestamp <
              RATE_LIMIT_WINDOW
          );

      attempts.push(now);

      rateLimitMap.set(
        ip,
        attempts
      );

      if (
        attempts.length >
        MAX_ATTEMPTS
      ) {
        throw new AppError(
          "Too many registration attempts. Please try again later.",
          429
        );
      }

      // Authenticate
      const decodedToken =
        await authenticateRequest(
          req
        );

      // Form data
      const formData =
        await req.formData();

      const name =
        normalizeText(
          formData.get("name")
        );

      const rollNo =
        normalizeText(
          formData.get("rollNo")
        );

      const email =
        normalizeText(
          formData.get("email")
        ).toLowerCase();

      const file =
        formData.get("photo");

      if (
        !name ||
        !rollNo ||
        !email ||
        !file
      ) {
        throw new ValidationError(
          "Name, rollNo, email, and photo are required"
        );
      }

      if (
        !EMAIL_PATTERN.test(email)
      ) {
        throw new ValidationError(
          "Invalid email address"
        );
      }

      // Prevent registering another user
      if (
        decodedToken.email !==
        email
      ) {
        throw new ForbiddenError(
          "Forbidden: Cannot register face for a different user"
        );
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        throw new ValidationError(
          "File size exceeds 5MB limit"
        );
      }

      if (
        !ALLOWED_IMAGE_TYPES.has(
          file.type
        )
      ) {
        throw new ValidationError(
          "Invalid image type"
        );
      }

      // Convert to buffer
      const arrayBuffer =
        await file.arrayBuffer();

      const buffer =
        Buffer.from(arrayBuffer);

      // Validate actual size
      if (
        buffer.length >
        MAX_FILE_SIZE
      ) {
        return jsonError(
          `File too large. Maximum allowed size is ${
            MAX_FILE_SIZE /
            1024 /
            1024
          } MB.`,
          413
        );
      }

      // Validate magic bytes
      if (
        !validateMagicBytes(
          buffer,
          file.type
        )
      ) {
        return jsonError(
          "Invalid image content.",
          415
        );
      }

      // Connect DB
      const db =
        await connectDb();

      const users =
        db.collection("users");

      // Existing user check
      const existingUser =
        await users.findOne({
          $or: [
            { rollNo },
            { email },
          ],
        });

      if (existingUser) {
        throw new AppError(
          "User already registered",
          409
        );
      }

      // Generate filename
      const safeName =
        name.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        ) || "user";

      const fileExtension =
        getImageExtension(
          file.type
        );

      const fileName = `labels/${safeName}/${randomUUID()}.${fileExtension}`;

      // Upload blob
      const blob = await put(
        fileName,
        buffer,
        {
          contentType:
            file.type,

          access: "public",
        }
      );

      try {
        const user = {
          name,
          rollNo,
          email,
          image: blob.url,
          firebaseUid:
            decodedToken.uid,
        };

        const result =
          await users.insertOne(
            user
          );

        return jsonSuccess(
          {
            message:
              "User registered successfully",

            user: {
              _id:
                result.insertedId,

              name:
                user.name,

              rollNo:
                user.rollNo,

              email:
                user.email,
            },
          },
          201
        );
      } catch (dbError) {
        try {
          await del(blob.url);
        } catch (
          cleanupError
        ) {
          console.error(
            "Failed cleanup:",
            cleanupError
          );
        }

        throw dbError;
      }
    }
  );
```
