/**
 * Cryptographic Session Token & Cookie Utility
 * Uses Web Crypto API (crypto.subtle) so it is 100% compatible with both
 * Next.js Edge Middleware and Node.js server runtimes.
 */

export const SESSION_COOKIE_NAME = "pdv_session";

// Fallback secret for development
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "pdv_enterprise_auth_secret_key_2026_production_grade_hmac_sha256";

/**
 * Base64URL encode/decode helpers
 */
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Import crypto key for HMAC-SHA256
 */
async function getCryptoKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign payload using HMAC-SHA256
 */
async function sign(data) {
  const key = await getCryptoKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Create a signed session token
 */
export async function createSessionToken(user, rememberMe = false) {
  const durationMs = rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 days
    : 24 * 60 * 60 * 1000; // 24 hours

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    supplierCode: user.supplierCode || null,
    supplierName: user.supplierName || null,
    department: user.department || null,
    exp: Date.now() + durationMs,
    iat: Date.now(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode session token
 */
export async function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const key = await getCryptoKey();
    const encoder = new TextEncoder();

    // Reconstruct raw signature bytes
    let base64Sig = signature.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) {
      base64Sig += "=";
    }
    const binarySig = atob(base64Sig);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(encodedPayload)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Cookie option generator
 */
export function getSessionCookieOptions(rememberMe = false) {
  const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAge,
  };
}
