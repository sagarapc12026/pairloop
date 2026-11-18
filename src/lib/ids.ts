import { randomBytes } from "crypto";
// Unambiguous alphabet: no 0/O/1/l/I.
const ALPHA = "23456789abcdefghjkmnpqrstuvwxyz";
export function inviteCode(len = 10) {
  const b = randomBytes(len);
  return Array.from(b, (x) => ALPHA[x % ALPHA.length]).join("");
}
