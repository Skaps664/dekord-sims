Migration notes: Neon -> MongoDB

What I changed

- Removed `@neondatabase/serverless` from `package.json` and added `mongodb` dependency.
- Replaced `lib/database.ts` implementation to use MongoDB. It exposes the same `DatabaseClient` class and methods.
- Updated API helper messages and routes to reference `MONGODB_URI` instead of `DATABASE_URL`/Neon.
- Added `scripts/init-mongo.js` to create collections and initialize counters for numeric auto-increment ids.

How IDs and relations are preserved

- The original app used numeric IDs and SQL joins. To preserve that behavior, the MongoDB client uses a `counters` collection to generate numeric `id` fields for documents (e.g. products, distributions).
- Collections use `id` fields (number) and relations reference those numeric ids (e.g. inventory.product_id -> products.id). This keeps calculations and relations unchanged.

Environment variables

- Set `MONGODB_URI` to your MongoDB connection string (or `DATABASE_URL` will also be accepted).

Quick setup

1. Install deps:

```bash
pnpm install
```

2. Initialize MongoDB (creates collections and counters):

```bash
MONGODB_URI="your-mongodb-uri" node scripts/init-mongo.js
```

3. Run the dev server:

```bash
pnpm dev
```

Notes and next steps

- I ran TypeScript checks and fixed type issues produced by the DB migration. Some unrelated TypeScript errors in UI components (props/types for charts and components) existed before and are unrelated to the DB migration — I did not modify their behavior.
- If you want, I can wire a data migration script to import your existing Postgres/Neon data into MongoDB. That requires access to the existing database dump or connection string.

If you'd like, I can now:
- Add a small test script that inserts a sample product and verifies inventory relations.
- Implement a one-time data migration helper (requires source DB access).
