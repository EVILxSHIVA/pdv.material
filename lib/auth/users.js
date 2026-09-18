import crypto from "crypto";
import { DEFAULT_SUPPLIERS } from "@/data/defaultSuppliers";

/**
 * Hash password using PBKDF2 with a unique salt
 */
export function hashPassword(password, salt = null) {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, generatedSalt, 1000, 64, "sha512")
    .toString("hex");
  return `${generatedSalt}:${hash}`;
}

/**
 * Verify password against stored hash (salt:hash)
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const computedHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(originalHash, "hex")
  );
}

// Pre-compute deterministic hashes for default seed accounts
const DEFAULT_ADMIN_PASSWORD_HASH = hashPassword("Admin@PDV2026!", "pdv_admin_salt_2026");
const DEFAULT_SUPPLIER_PASSWORD_HASH = hashPassword("Supplier@2026!", "pdv_supplier_salt_2026");

/**
 * In-memory user repository with default seed data
 * Supports runtime password updates (e.g. password reset)
 */
let userStore = [
  // 1. Primary Admin User
  {
    id: "usr_admin_001",
    email: "admin@pdv.com",
    name: "Shyam Aggarwal",
    role: "ADMIN",
    status: "Active",
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    department: "Operations & Procurement",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_admin_002",
    email: "shyam@pdv.com",
    name: "Shyam Aggarwal",
    role: "ADMIN",
    status: "Active",
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    department: "Operations & Procurement",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  // 2. Seeded Supplier Users (derived directly from DEFAULT_SUPPLIERS)
  ...DEFAULT_SUPPLIERS.map((sup, idx) => ({
    id: `usr_sup_${String(idx + 1).padStart(3, "0")}`,
    email: sup[4] || `supplier${idx + 1}@example.com`,
    name: sup[2] || sup[1], // Contact person or company name
    supplierName: sup[1],
    supplierCode: sup[0],
    mobile: sup[3],
    gst: sup[5],
    role: "SUPPLIER",
    status: sup[6] || "Active",
    passwordHash: DEFAULT_SUPPLIER_PASSWORD_HASH,
    createdAt: "2026-01-01T00:00:00.000Z",
  })),
];

// In-memory token store for password resets
const passwordResetTokens = new Map();

/**
 * Find user by email (case-insensitive)
 */
export function getUserByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return userStore.find((u) => u.email.toLowerCase() === normalized) || null;
}

/**
 * Find user by ID
 */
export function getUserById(id) {
  if (!id) return null;
  return userStore.find((u) => u.id === id) || null;
}

/**
 * Verify user credentials with role enforcement
 */
export function verifyCredentials(email, password, expectedRole) {
  const user = getUserByEmail(email);
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  if (user.status !== "Active") {
    return {
      success: false,
      error: "Your account is currently inactive. Please contact the administrator.",
    };
  }

  // Ensure role matches the tab/form the user submitted
  if (expectedRole && user.role !== expectedRole) {
    if (expectedRole === "ADMIN") {
      return {
        success: false,
        error: "This account is not registered as an Administrator. Please use the Supplier tab.",
      };
    } else {
      return {
        success: false,
        error: "This account is an Administrator. Please use the Admin tab to sign in.",
      };
    }
  }

  const isPasswordValid = verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, error: "Invalid email or password." };
  }

  // Return user without passwordHash
  const { passwordHash, ...safeUser } = user;
  return { success: true, user: safeUser };
}

/**
 * Update user password
 */
export function updateUserPassword(email, newPassword) {
  const user = getUserByEmail(email);
  if (!user) return false;
  user.passwordHash = hashPassword(newPassword);
  return true;
}

/**
 * Create a secure password reset token (1 hour expiry)
 */
export function createPasswordResetToken(email) {
  const user = getUserByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  passwordResetTokens.set(token, {
    email: user.email,
    expiresAt,
  });

  return token;
}

/**
 * Verify reset token
 */
export function verifyResetToken(token) {
  if (!token || !passwordResetTokens.has(token)) return null;
  const entry = passwordResetTokens.get(token);
  if (Date.now() > entry.expiresAt) {
    passwordResetTokens.delete(token);
    return null;
  }
  return entry.email;
}

/**
 * Complete password reset
 */
export function resetPasswordWithToken(token, newPassword) {
  const email = verifyResetToken(token);
  if (!email) return false;
  const updated = updateUserPassword(email, newPassword);
  if (updated) {
    passwordResetTokens.delete(token);
  }
  return updated;
}
