# Simple Setup: Lake Group CMS on Vercel + Backend on Render

This guide is for people who don't work with servers. It tells you exactly what
to click, copy, and paste. You only need to set **6 values** on Render and
**nothing** on Vercel — everything else the project now does automatically.

The pieces:

```
Your browser
   ↓
CMS (Vercel) ──── calls ────▶ Backend (Render) ────▶ Database (Render PostgreSQL)
```

---

## Plain-language terms

| Word | What it means |
|---|---|
| **Internal Database URL** | The private address Render uses to let your backend talk to your database *inside* Render's network. Your browser can't use it, and that's fine — only the backend needs it. |
| **Origin** | The website address of your CMS, e.g. `https://my-cms.vercel.app` or `https://cms.lakegroup.com`. |
| **Secret** | A value that must stay private, like a password. Never paste it into a chat, email, or code. |
| **Redeploy** | Push the "Deploy" button again so the service restarts with the new settings. |

---

## STEP 1 — Open Render PostgreSQL (get the database address)

1. Go to https://dashboard.render.com and sign in.
2. In the left menu click **PostgreSQL**.
3. Click your database — the one named **Lake Group Web Database**.
4. On the database page, click **Connections** (left side of the page).
5. Find **Internal Database URL**.
6. Click the **copy** button next to it. This is a **secret** — keep it to
   yourself. You'll paste it in Step 2.

> Use the **Internal** URL, not the External one. The External URL was only
> for the one-time move of the data and must not be used by the live backend.

## STEP 2 — Open Render Backend (enter the 6 values)

1. Go to https://dashboard.render.com → left menu click **Web Services**.
2. Click your backend service (the one whose address ends in
   `lake-group-web-backend.onrender.com`).
3. Click **Environment** in the left menu.
4. For each row below, click **Add Environment Variable** (or edit the row if
   it already exists), type the name, paste/type the value, and save.

| # | Name (type exactly) | Value | Secret? | Where to get it |
|---|---|---|---|---|
| 1 | `NODE_ENV` | `staging` | No | Just type it |
| 2 | `DATABASE_URL` | the Internal Database URL from Step 1 | **Yes** | Copy from Step 1 |
| 3 | `SESSION_SECRET` | a long random string | **Yes** | Type in a terminal on your PC: `openssl rand -hex 32` (or any 40+ random letters/numbers) |
| 4 | `MFA_ENCRYPTION_KEY` | the long base64 value | **Yes** | On this PC, open the file `backend/.env` and copy everything after `MFA_ENCRYPTION_KEY=` — do NOT generate a new one, the database's security depends on this exact value |
| 5 | `CMS_ALLOWED_ORIGINS` | the CMS origin from Step 3 | No | e.g. `https://my-cms.vercel.app` (no trailing slash, no quotes) |
| 6 | `DEV_MFA_SKIP_EMAILS` | `cms-dev@lakegroup.com` | No | Just type it |

5. Click **Save Changes** at the bottom.
6. Click **Deploy** (top of the page) → **Deploy latest commit**.
7. Wait until the service shows **Live** (a few minutes).

> You do NOT need to set these — the project now handles them automatically:
> `PORT`, `DATABASE_URL_RUNTIME`, `SESSION_COOKIE_SECURE`, `TRUST_PROXY`,
> `CSRF_ALLOWED_ORIGINS`, `MFA_REQUIRED_ROLES`, `MEDIA_STORAGE_DRIVER`,
> `LOG_LEVEL`, `SESSION_TTL_MS`, `SESSION_ROLLING`, `RECENT_AUTH_WINDOW_MS`,
> `BCRYPT_COST`, `METRIC_STALE_DAYS`.

## STEP 3 — Open Vercel CMS (nothing to add)

The CMS now automatically uses `https://lake-group-web-backend.onrender.com` when it is
built for production, so **Vercel needs no environment variables at all**.

You only need the CMS address for Step 2 value #5:

1. Go to https://vercel.com → click your CMS project (the one built from the
   `cms/` folder).
2. On the project page, click **Settings** → **Domains**.
3. Copy the address shown there (something like `https://my-cms.vercel.app`
   or `https://cms.lakegroup.com`). Paste it into Render value #5.
4. If the CMS was deployed before today, click **Deployments** → **Redeploy**
   (the newest deployment, then "Redeploy") so the new automatic API address
   is included.

## STEP 4 — Test login

1. Open your CMS address (from Step 3).
2. Sign in with the demo account:
   - Email: `cms-dev@lakegroup.com`
   - Password: `LakeDev2026!`
3. You should land on the dashboard.

## One important note about sessions (only if you get signed out immediately)

If login appears to work but you're sent back to the login page right away, the
cause is a browser security rule: the CMS (vercel.app) and the API
(onrender.com) are different "sites", and the session cookie is only sent
between the *same* site. This is a deliberate security setting and must not be
weakened to make it work.

The proper fix is custom domains on the same site, e.g. point
`cms.lakegroup.com` at Vercel and `api.lakegroup.com` at Render (ask your
developer to help with the DNS entries — no application code changes needed).
Once both use `lakegroup.com`, sessions persist normally.

## How to know it worked

- Render service shows **Live** and stays running.
- Open `https://lake-group-web-backend.onrender.com/health` in your browser — it must
  show `"status":"ok"` and `"db":"up"`.
- The CMS login page loads, and signing in with the demo account takes you to
  the dashboard.

If anything fails, copy the Render startup log (Web Services → your service →
**Logs**) and the exact error message from the CMS screen and send them to your
developer.
