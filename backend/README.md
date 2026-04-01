# Backend

Minimal Express + PostgreSQL backend for the DBMS demo project.

## Local Setup

1. Create a `.env` file from `.env.example`.
2. Install dependencies:
   `npm install`
3. Start the server:
   `npm run dev`

The app reads local environment variables with `dotenv`, while hosted deployments use environment variables supplied by the platform.

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /datasets`
- `GET /datasets/:datasetId`
- `GET /datasets/:datasetId/feedback`
- `POST /datasets/:datasetId/feedback`
- `POST /datasets/upload`
- `GET /versions/:versionId/download`
- `POST /ai/suggest-metadata`

## Render Deployment

- Service type: `Web Service`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `OPENAI_API_KEY`
- `AI_MODEL`

Notes:

- Render provides `PORT` automatically, and the server already binds to `process.env.PORT || 5000`.
- With GitHub connected to Render, future pushes redeploy the service automatically.
- Supabase/hosted PostgreSQL connections use SSL automatically; local `localhost` Postgres connections continue to work without SSL.
- `POST /ai/suggest-metadata` uses a real OpenAI model response when `OPENAI_API_KEY` is configured, and safely falls back when it is not.

## Notes

- Database schema is expected to already exist from `schema.sql`, `roles.sql`, and `seed.sql`.
- Uploaded CSV files are stored under `backend/uploads`, and the upload directory is created automatically at runtime if it does not exist.
- JWT bearer auth is required for protected endpoints.
- Render's local filesystem is ephemeral, so uploaded files stored in `backend/uploads` can be lost after redeploys or restarts. For a durable production setup, persistent object storage would be needed later.
- AI metadata suggestions use a lightweight CSV preview instead of sending the whole file to the model.
- If the AI call fails, the endpoint returns a safe fallback response so the demo does not break.
