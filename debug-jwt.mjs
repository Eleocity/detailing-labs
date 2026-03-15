// Debug script to decode a JWT without verification
// Usage: node debug-jwt.mjs <token>
const token = process.argv[2];
if (!token) {
  console.log("Usage: node debug-jwt.mjs <jwt-token>");
  process.exit(1);
}
const parts = token.split(".");
if (parts.length !== 3) {
  console.log("Not a valid JWT");
  process.exit(1);
}
try {
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  console.log("Header:", JSON.stringify(header, null, 2));
  console.log("Payload:", JSON.stringify(payload, null, 2));
} catch (e) {
  console.log("Failed to decode:", e.message);
}
