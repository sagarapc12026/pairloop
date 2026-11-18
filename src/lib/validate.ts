import { z } from "zod";
export const email = z.string().trim().toLowerCase().email().max(200);
export const password = z.string().min(6, "Use at least 6 characters").max(200);
export const name = z.string().trim().min(1).max(40);
