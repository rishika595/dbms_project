# Backend

Minimal Express + PostgreSQL backend for the DBMS demo project.

## Local Setup

1. Create a `.env` file from `.env.example`.
2. Install dependencies:
   `npm install`
3. Start the server:
   `npm run dev`

The app reads local environment variables with `dotenv`, while hosted deployments use environment variables supplied by the platform.

## Run Locally

For a teammate to run the backend locally, including the AI feature:

1. Go into the backend folder:
   `cd backend`
2. Install dependencies:
   `npm install`
3. Create a local env file from the example:
   copy `.env.example` to `.env`
4. Fill in these values in `backend/.env`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `OPENAI_API_KEY`
   - `AI_MODEL`
5. Start the backend:
   `npm run dev`

Notes:

- If `OPENAI_API_KEY` is present, `POST /ai/suggest-metadata` will attempt a real OpenAI call.
- If `OPENAI_API_KEY` is missing, the endpoint still works but returns the safe fallback response.
- Uploaded CSV files are saved locally to `backend/uploads`, so the local upload -> AI flow works on a teammate's machine without any Render-specific setup.

### Local AI Test Flow

1. Register a user with `POST /auth/register` or log in with `POST /auth/login`.
2. Copy the returned JWT token.
3. Upload a CSV using `POST /datasets/upload` with:
   - `Authorization: Bearer <token>`
   - form-data fields: `title`, `description`, `file`
4. Take the returned `datasetId`.
5. Call `POST /ai/suggest-metadata` with:
   - `Authorization: Bearer <token>`
   - `Content-Type: application/json`
   - body:
     `{"datasetId":"<datasetId>"}`

Result:

- Real AI success includes `"source": "ai"`
- Fallback mode includes `"source": "fallback"`

Useful local logs:

- whether AI is configured locally
- whether AI call was attempted
- whether fallback was used
- the resolved CSV file path used for preview

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
