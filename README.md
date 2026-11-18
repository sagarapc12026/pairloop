# Pairloop

**One list for the two of you.** Shared tasks, priority reminders that keep nudging, a shared calendar, a dashboard, and wishlists for partners.

- **Type or say a task.** "Sam pick up kids today at 3pm urgent" becomes a priority task for Sam, due today at 3 PM. Review the details, then save.
- **Shared or private.** Every task is visible to both partners unless marked private.
- **Assign** to yourself, your partner, or both. Completing a task notifies the other person.
- **Priority reminders** go to both phones 15, 10 and 5 minutes before the due time, at the due time, then every 10 minutes (for up to 2 hours) until someone marks it done or turns reminders off. Notifications have **Mark done** and **Stop reminders** buttons.
- **Calendar** of every dated task. **Dashboard** with totals, completed, priority, overdue, and who's carrying what.
- **Wishlists** (shopping, travel, date night, home, other). Both partners see them and either can say "I'll make it happen". Only the person who made a wish can remove it or mark it as come true.
- **Freemium.** One person signs up and shares an invite link. Free covers both partners for the first 10 tasks; Premium is $19.99/year for the pair (Stripe).
- **Installable PWA** with Web Push (Android, desktop, and iPhone on iOS 16.4+ once added to the Home Screen).

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma + Postgres · Web Push (VAPID) · Stripe · chrono-node (date parsing) · Web Speech API (voice).

---

## Run locally

```bash
cp .env.example .env        # fill in the values (see comments in the file)
npm install
npx prisma migrate dev      # creates the tables
npm run dev                 # http://localhost:3000
```

You need a Postgres database. A free Neon database works, or local Postgres.

## Deploy: GitHub → Vercel

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/<you>/pairloop.git
   git push -u origin main
   ```
2. **Import into Vercel**: vercel.com → *Add New → Project* → pick the repo. Framework is detected as Next.js.
3. **Add a database**: in the Vercel project, *Storage → Create → Neon (Postgres)*, and connect it to the project. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
4. **Environment variables** (*Settings → Environment Variables*). Add everything else from `.env.example`:
   - `AUTH_SECRET`: `openssl rand -hex 32`
   - `CRON_SECRET`: `openssl rand -hex 16`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: from `npx web-push generate-vapid-keys`
   - `VAPID_SUBJECT`: `mailto:you@yourdomain.com`
   - `NEXT_PUBLIC_APP_URL`: your production URL
   - `FREE_TASK_LIMIT`: `10`
5. **Deploy.** The build runs `prisma migrate deploy`, so tables are created automatically.

> **Deploying before you have a database? You get demo mode.** With no database configured, the app runs entirely in the browser: "Explore the demo" signs you in to a sample loop, every screen works, and data is kept only in that browser's localStorage (nothing reaches the server). A demo bar lets you switch to the partner's view or reset. Push notifications to phones, partner invites and real payments need the full version; in the demo, "Go Premium" unlocks Premium locally.
> Demo mode turns off automatically once you add `DATABASE_URL` and redeploy. You can also force it with `DEMO_MODE=1` (or off with `DEMO_MODE=0`). The Vercel build log prints `[pairloop] demo mode: ON/off`.
> The build accepts `DATABASE_URL`, `POSTGRES_PRISMA_URL` or `POSTGRES_URL` for the main connection, and `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING` or `DIRECT_URL` for migrations. With only a Neon pooled URL, it works out the direct one by itself.

### Priority reminders (important)

Reminders are sent by `GET /api/cron/reminders`, which must be called **every minute**:

- **Easiest (free):** create a job on [cron-job.org](https://cron-job.org) that runs every minute and calls
  `https://YOUR-APP/api/cron/reminders?secret=YOUR_CRON_SECRET`
- **Vercel Pro:** add a `vercel.json` with `{"crons":[{"path":"/api/cron/reminders","schedule":"* * * * *"}]}`. Vercel sends `CRON_SECRET` automatically. (Hobby plans only allow daily crons, so a per-minute cron will fail the deploy there.)
- **Backup:** `.github/workflows/reminders.yml` pings every ~5 minutes if you add `APP_URL` and `CRON_SECRET` as GitHub repo secrets.

While either partner has the app open, it also triggers reminders itself every 30 seconds, so reminders still fire with no cron set up, just less reliably.

### Payments (Stripe)

1. Add `STRIPE_SECRET_KEY` (start with a test key).
2. Stripe Dashboard → *Developers → Webhooks* → add endpoint `https://YOUR-APP/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (*Settings → Billing → Customer portal*) so subscribers can manage or cancel.

Without Stripe keys the app works fully. "Go Premium" shows a message saying payments aren't set up yet.

## How the freemium rules work

| | Free | Premium ($19.99/yr) |
|---|---|---|
| Partners per loop | 2 | 2 |
| Tasks | 10 created in total | Unlimited |
| Reminders, calendar, dashboard, wishlists | Yes | Yes |

The count is of tasks *created*, so deleting tasks doesn't reset it. Change `FREE_TASK_LIMIT` to adjust it. The logic is in `src/lib/plan.ts`.

## Project map

```
prisma/schema.prisma           data model (Space = a couple's "loop")
src/lib/parse.ts               natural-language task parser (runs in the browser)
src/lib/reminders.ts           priority reminder schedule + sender (idempotent)
src/lib/notify.ts              in-app notifications + Web Push fan-out
src/app/api/*                  REST endpoints
src/app/app/*                  the signed-in app (tasks, calendar, wishlist, dashboard, settings)
src/components/Composer.tsx    quick add: type or speak, review, save
public/sw.js                   service worker (push + notification actions)
```
