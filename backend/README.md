# Backend

Minimal Express + PostgreSQL backend for the DBMS demo project.

## Setup

1. Create a `.env` file from `.env.example`.
2. Install dependencies:
   `npm install`
3. Start the server:
   `npm run dev`

## Endpoints

- `POST /auth/login`
- `GET /datasets`
- `GET /datasets/:datasetId`
- `GET /datasets/:datasetId/feedback`
- `POST /datasets/:datasetId/feedback`
- `POST /datasets/upload`
- `GET /versions/:versionId/download`
- `POST /ai/suggest-metadata`

## Notes

- Database schema is expected to already exist from `schema.sql`, `roles.sql`, and `seed.sql`.
- Uploaded CSV files are stored under `backend/uploads`.
- JWT bearer auth is required for protected endpoints.
