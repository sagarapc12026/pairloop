export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
