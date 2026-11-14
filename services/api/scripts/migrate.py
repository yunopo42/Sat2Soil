"""Applies supabase/migrations/*.sql in order, then optionally supabase/seed.sql (D-010, D13).

Applied versions are recorded in supabase_migrations.schema_migrations, the same table the
Supabase CLI uses, so `supabase db push` later sees them as applied.

Usage (from the repo root):  pnpm db:migrate            # migrations only
                             pnpm db:migrate --seed     # migrations + seed data
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import psycopg

from app.core.config import get_settings

REPO = Path(__file__).resolve().parents[3]
MIGRATIONS = REPO / "supabase" / "migrations"
SEED = REPO / "supabase" / "seed.sql"

BOOTSTRAP = """
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", action="store_true", help="also apply supabase/seed.sql")
    args = parser.parse_args()

    settings = get_settings()
    if settings.database_url is None:
        print("DATABASE_URL is not set (services/api/.env)", file=sys.stderr)
        return 1

    with psycopg.connect(settings.database_url.get_secret_value(), autocommit=True) as conn:
        conn.execute(BOOTSTRAP)
        applied = {
            row[0]
            for row in conn.execute("select version from supabase_migrations.schema_migrations")
        }
        files = sorted(MIGRATIONS.glob("*.sql"))
        for path in files:
            version, _, name = path.stem.partition("_")
            if version in applied:
                print(f"  = {path.name}")
                continue
            sql = path.read_text(encoding="utf-8")
            with conn.transaction():
                conn.execute(sql)
                conn.execute(
                    "insert into supabase_migrations.schema_migrations (version, name, statements)"
                    " values (%s, %s, %s)",
                    (version, name, [sql]),
                )
            print(f"  + {path.name}")

        if args.seed:
            with conn.transaction():
                conn.execute(SEED.read_text(encoding="utf-8"))
            print("  + seed.sql")

        postgis = conn.execute(
            "select extversion from pg_extension where extname = 'postgis'"
        ).fetchone()
        print(f"done · {len(files)} migration(s) · postgis {postgis[0] if postgis else 'missing'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
