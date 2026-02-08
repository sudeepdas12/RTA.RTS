# Developer Setup & Troubleshooting 🛠️

This document collects reproducible development setup and recovery steps (copy-paste ready) focused on Docker + Postgres initialization issues and other common problems encountered while running the project locally.

---

## Quick links
- README: `README.md`
- Docker Compose: `docker-compose.yml`
- Backend env: `backend/.env`

---

## Prerequisites
- Docker & Docker Compose (or Docker CLI with compose plugin)
- `docker` and `docker compose` available in your PATH
- Git and repository cloned
- `backend/.env` populated before `docker compose up`

---

## Problem: Postgres container runs but backend cannot connect
You may see logs like `database "rta_user" does not exist` or `failed to resolve host 'db'`. This often happens when a DB volume already contains data from a previous initialization and Postgres skips the intended initialization step.

### Non-destructive recovery (recommended)
1. Confirm the container name:
```bash
# show the compose services and container names
docker compose ps
```

2. Inspect environment variables inside the running DB container to find configured user/password (optional):
```bash
docker inspect <db-container> --format "{{range .Config.Env}}{{println .}}{{end}}"
```

3. Connect to the DB container and open psql using the configured credentials:
```bash
# substitute <db-container>, POSTGRES_USER and POSTGRES_PASSWORD accordingly
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it <db-container> psql -U "$POSTGRES_USER" -d postgres
```

4. Inside psql, inspect databases and users and create missing resources if needed:
```sql
\l            -- list databases
\du           -- list roles/users
-- If the required DB is missing
CREATE DATABASE rta_rts_db;
-- If the role/user is missing (choose a secure password)
CREATE ROLE rta_user WITH LOGIN PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;
```

5. Re-check backend logs and health:
```bash
docker compose logs -f backend
docker compose ps
```

6. If migrations did not run, trigger them inside the backend container:
```bash
# run migrations inside backend container
docker exec -it <backend-container> python manage.py migrate --noinput
```

### Destructive option (reinitialize DB volume)
If you do not need existing data and want a clean start:
```bash
# WARNING: this deletes DB data
docker compose down -v
docker compose up --build
```

> NOTE: when `docker compose up` initializes a brand-new DB volume, Postgres will create `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` automatically based on the environment variables passed to the container.

### Useful checks and commands
- Follow DB logs:
```bash
docker compose logs -f db
```
- Check service health with:
```bash
docker compose ps
```
- Check for the obsolete `version:` top-level attribute in `docker-compose.yml` — remove it to suppress a harmless warning.

---

## Suggested improvements (optional)
- Add an idempotent DB init script to the DB container entrypoint that ensures the required DB/user exist on startup (non-destructive). Test thoroughly before adding to repo.
- Add a simple health endpoint or `manage.py check_db` management command that can be run from CI to validate DB connectivity.

---

## Quick verification checklist
- [ ] `backend/.env` exists and credentials are correct
- [ ] `docker compose ps` shows `db`, `backend`, `frontend` containers
- [ ] `docker compose logs backend` shows "Database connection OK" and migrations applied
- [ ] Frontend served on `http://localhost:3000` and backend on `http://localhost:8000`

---

## If you need help
Open an issue or ping the team with:
- Last `docker compose logs --tail=200` output
- `docker ps` output
- `backend/.env` (DO NOT post secrets in public) and steps you tried

---

## Frontend CSS: verification & visual test
If you changed navigation CSS, verify visually and with a quick test:

Manual visual verification
1. Start the frontend dev server:
```bash
cd frontend
npm start
```
2. Open `http://localhost:3000` in your browser and inspect the navbar: it should be `position: sticky` at the top, with a frosted blur and purple gradient.

Automated, text-based verification (unit test)
1. Run the frontend tests (we added a small Jest test to verify CSS variables and duplicate/conflicting declarations):
```bash
cd frontend
npm test -- navigationbar-css
```
2. The test checks for presence of `:root` CSS variables and absence of duplicate/conflicting `position`/`overflow` declarations.

If you want a screenshot-based visual verification added later (Playwright or Puppeteer) I can add it in a follow-up PR.

---

**Version**: 1.0.0
**Last Updated**: February 8, 2026
