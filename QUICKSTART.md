# Quickstart — SIH26012 AI 3D Cadastral Mapping & Encroachment Engine

Get the full stack (FastAPI + PostGIS + Next.js/CesiumJS) running locally in
three steps.

**Prerequisites:** Python 3.11+, Node.js 18+, and a Supabase project with
PostGIS available (Project Settings → Database → Connection string).

---

## Step 1 — Backend (FastAPI + PostGIS)

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create your `.env` from the template and fill in your own Supabase
connection string:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://postgres:<your-url-encoded-password>@db.<your-project-ref>.supabase.co:5432/postgres?ssl=require
```

> If your database password contains `@`, encode it as `%40` — otherwise
> it gets misread as the `user@host` separator. Keep `?ssl=require`;
> Supabase's direct connection on port 5432 requires it.

Start the API — on first launch it auto-verifies PostGIS is enabled and
creates the `cadastral_parcels` table if it doesn't exist yet:

```bash
uvicorn app.main:app --reload --port 8000
```

Confirm it's up: open **http://127.0.0.1:8000/api/health** — you should see
`"status": "ok"` and a PostGIS version string.

---

## Step 2 — Frontend (Next.js + CesiumJS)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend URL from `frontend/.env.local` (already set
to `http://127.0.0.1:8000` — only change this if your backend runs
elsewhere).

---

## Step 3 — Use it

Open **http://localhost:3000**.

- Drag a drone orthomosaic/DEM `.tif`/`.tiff` onto the upload card.
- It streams to the backend, gets a raster preview draped onto the Cesium
  globe at its exact bounding box, and 3D parcels are auto-extracted and
  rendered as extruded, severity-colored polygons.
- Parcel Statistics and Encroachment Alerts in the sidebar populate live
  from the real extraction results.

That's it — both servers running, database connected, ready to upload.
