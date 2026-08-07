# vedoras.com — Hostinger Shared Hosting Deployment

Target: **Hostinger shared web hosting managed from hPanel** (`u430927796@in-mum-web1338`, `~/domains/vedoras.com/`). This is **not** a VPS: there is no root, no `/etc/nginx`, no `systemd`, and **`npm` does not exist in SSH** — everything runs through hPanel's managed tooling. `deploy/nginx-vedoras.conf` does **not** apply here; it is only for a future VPS.

In this setup the **Node.js process serves everything itself**: the built SPA (from `CLIENT_DIST`) and the API (under `/api`) share one origin on `https://vedoras.com`. No CORS, cookies just work.

## How the pieces fit

After the git deploy the repo (monorepo) lives directly in the web root:

```
~/domains/vedoras.com/public_html/       <- web root == app root == repo root
├── index.html, assets/...               <- copied from client/dist by the install command
├── client/  server/  node_modules/  .git/  package.json ...
└── server/dist/index.js                 <- built by the install command; this is the app entry
~/domains/vedoras.com/uploads/           <- OUTSIDE public_html; never touched by git deploys
```

## Step 1 — Remove the Website Builder site (unblocks the web root)

The Zyro/Hostinger Website Builder site for vedoras.com is still active and shadows `public_html` (that's the "Home" template and the 403s). In hPanel:

1. **Websites** → **Website Builder** (or hPanel home) → find the vedoras.com site.
2. Delete it (or at minimum **unpublish** it). The domain must serve `public_html`, not the builder.
3. Optionally also delete the parked/default page.

Until this is done the site will keep flapping between the builder template and 403.

## Step 2 — Git deploy settings

In hPanel → **Websites** → vedoras.com → **Git** (Deploy from Git):

| Setting | Value |
| --- | --- |
| Repository | your repo (connected to GitHub) |
| Root directory | `./` |
| Node.js version | `22.x` |
| Install command | `npm ci && npm run build && cp -r client/dist/. .` |
| Deployment trigger | push to `main` (auto) |

Notes:
- The **Install command runs in Hostinger's build pipeline where Node/npm exist**. Do **not** try to run npm yourself in SSH — it doesn't exist there. Any change to the command requires a manual **Deploy** to take effect.
- `npm ci` installs exactly the committed lockfile; `npm run build` builds both workspaces (`client/dist` via Vite, `server/dist` via tsc); `cp -r client/dist/. .` lands the SPA at the web root. The trailing `.` form also copies dotfiles.
- `client/dist/` and `server/dist/` are gitignored, so they only exist on the server after a build. That's expected.

## Step 3 — Create the Node.js application

hPanel → **Websites** → vedoras.com → **Node.js** (or the Node.js section under the domain):

| Setting | Value |
| --- | --- |
| Application root | `public_html` (i.e. `/home/u430927796/domains/vedoras.com/public_html`) |
| Startup / entry file | `server/dist/index.js` |
| Node.js version | `22.x` |

- **Do not set `PORT`.** Hostinger assigns a runtime port; `server/src/index.ts` binds `process.env.PORT` (falls back to 5000 only if unset, so it can't conflict).
- After creating it, hit **Restart** so it picks up the freshly built `server/dist`.

## Step 4 — Environment variables

hPanel → **Node.js** → **Environment variables** (add each key/value). The hPanel values are real `process.env` and take precedence over any `.env` file; secrets never touch the repo.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `API_VERSION` | `v1` |
| `CLIENT_URL` | `https://vedoras.com,https://www.vedoras.com` |
| `MONGODB_URI` | your Atlas string (Step 5) |
| `TRUST_PROXY` | `true` |
| `JWT_ACCESS_SECRET` | generated secret (below) |
| `JWT_REFRESH_SECRET` | generated secret (below) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `JWT_ISSUER` | `vedoras` |
| `COOKIE_SAME_SITE` | `lax` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX` | `300` |
| `AUTH_RATE_LIMIT_MAX` | `30` |
| `UPLOAD_DIR` | `/home/u430927796/domains/vedoras.com/uploads` |
| `CLIENT_DIST` | `/home/u430927796/domains/vedoras.com/public_html` |

Generate the two JWT secrets (>=32 chars; the app exits at boot otherwise):

```bash
openssl rand -base64 48
# or, if openssl is unavailable:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`server/.env.production` in this repo already mirrors this table (with real secrets) if you want to copy from it. No client build-time env is needed: `client/src/services/httpClient.ts` defaults `VITE_API_URL` to `/api/v1`, matching the same-origin layout.

## Step 5 — MongoDB (Atlas)

Shared hosting ships **no MongoDB**, so use a free Atlas cluster:

1. https://www.mongodb.com/cloud/atlas → **Create** a free **M0** cluster.
2. **Database Access** → add a database user (not the admin account).
3. **Network Access** → allow `0.0.0.0/0` (shared hosting can't pin IPs).
4. **Connect** → "Drivers" → copy the `mongodb+srv://...` string into `MONGODB_URI`, replacing `<password>` with the database user's password and ensuring the database name is `vedoras`.

## Step 6 — SSL

hPanel → vedoras.com → **SSL** → install/verify for both `vedoras.com` and `www.vedoras.com`. If the bare domain previously failed, **remove and re-issue** the certificate. `www` needs its own entry (the `www` CNAME points at Hostinger's CDN).

## Step 7 — Verify

```bash
curl -sI https://vedoras.com/                # 200, text/html (the SPA)
curl -s  https://vedoras.com/api/v1/health   # {"status":"ok",...}
curl -s  https://vedoras.com/api/v1/categories
curl -sI https://www.vedoras.com/            # 200 (redirect to / is fine)
```

Open `https://vedoras.com/admin` in a browser and confirm the admin dashboard loads (it's a SPA route — must return 200, not 404).

## Redeploys & upload safety

- Each git deploy re-runs the install command, so the SPA at the web root and `server/dist` are always rebuilt. You do **not** need to SSH or run npm.
- Uploads live in `UPLOAD_DIR` **outside** `public_html`, so redeploys never wipe user files. Create that directory once (File Manager) and make sure the app user can write to it.
- Pushing to `main` triggers an auto-redeploy; you can also hit **Deploy** manually in the Git section.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Site shows "Home" template or parked page | Step 1 not done — Website Builder still active. |
| `403 Forbidden` | No `index.html` at the web root (install command didn't run / deploy failed). Check build logs; re-run **Deploy**. |
| `502`/`503` | Node app down. Check the Node.js app logs in hPanel. |
| App exits at boot | Env validation failed — the startup log prints the exact invalid fields (e.g. `MONGODB_URI` or a short JWT secret). `server/src/config/env.ts` validates everything and exits with code 1. |
| `www` differs from `https://vedoras.com` | `www` needs its own SSL entry and its CNAME to Hostinger CDN. |
| `/admin` returns 404 at the web root | Install command didn't copy the SPA (must include `cp -r client/dist/. .`). |
| Uploads lost after redeploy | `UPLOAD_DIR` must be outside `public_html`. |

## Moving to a VPS later

If you outgrow shared hosting, `deploy/nginx-vedoras.conf` + the classic VPS env block in `server/.env.example` cover the reverse-proxy layout (nginx serves the SPA; proxies `/api`, `/uploads`, `/socket.io`).
