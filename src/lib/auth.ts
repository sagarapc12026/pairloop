import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession, sessionCookieOptions } from "./session";

export async function currentUser() {
  const jar = await cookies();
  const id = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return db.user.findUnique({ where: { id }, include: { space: true } });
}

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Please sign in again.");
  return u;
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Wrap a route handler so thrown HttpErrors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      }
      if (e && typeof e === "object" && "issues" in e) {
        return NextResponse.json({ error: "Some fields look off. Check them and try again." }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong on our side. Try again." }, { status: 500 });
    }
  };
}
