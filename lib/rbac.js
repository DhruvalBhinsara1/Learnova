import { authenticateRequest } from "@/lib/error-handler";
import { getUserProfile } from "@/lib/firebase-admin";
import { ForbiddenError } from "@/lib/errors";

/**
 * Requires the request to have a valid Firebase auth token.
 * Extends `authenticateRequest` by ensuring it's robust and returns the token payload.
 * 
 * @param {Request} request 
 * @returns {Promise<Object>} Decoded Firebase ID token payload
 * @throws {UnauthorizedError} if token is missing or invalid
 */
export async function requireAuth(request) {
  const decodedToken = await authenticateRequest(request);
  return decodedToken;
}

/**
 * Ensures the authenticated user has a role that matches one of the allowed roles.
 * Uses the JWT custom claims (set via Firebase Admin SDK) as the authoritative
 * source of truth for role-based authorization. Firestore profile data is not
 * used for auth decisions, preventing role mismatch during async claim propagation.
 * 
 * @param {Request} request 
 * @param {string[]} allowedRoles Array of allowed roles (e.g., ["admin", "teacher"])
 * @returns {Promise<{ payload: Object }>}
 * @throws {UnauthorizedError} if token is invalid
 * @throws {ForbiddenError} if the user's role is not in the allowed list
 */
export async function requireRole(request, allowedRoles) {
  const payload = await requireAuth(request);
  const userRole = payload.role;

  if (!userRole) {
    throw new ForbiddenError("User role not found in token claims. Access denied.");
  }

  if (!allowedRoles.includes(userRole)) {
    throw new ForbiddenError(`Forbidden: Requires one of ${allowedRoles.join(", ")}`);
  }

  return { payload };
}

/**
 * Helper to require Admin role.
 */
export async function requireAdmin(request) {
  return requireRole(request, ["admin"]);
}

/**
 * Helper to require Teacher role.
 */
export async function requireTeacher(request) {
  return requireRole(request, ["teacher"]);
}

/**
 * Helper to require Student role.
 */
export async function requireStudent(request) {
  return requireRole(request, ["student"]);
}
