set search_path to pgfarm, public;

DO $$ BEGIN
  CREATE TYPE pgfarm.backup_status AS ENUM (
    'RUNNING',
    'SUCCESS',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- History of backup/restore/archive runs, so success/failure/timing is queryable
-- instead of only existing in pod logs.
CREATE TABLE IF NOT EXISTS pgfarm.backup_log (
    backup_log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id) ON DELETE CASCADE,
    operation text NOT NULL DEFAULT 'backup', -- backup, restore, archive
    status pgfarm.backup_status NOT NULL DEFAULT 'RUNNING',
    error text,
    started_at timestamp NOT NULL DEFAULT now(),
    finished_at timestamp
);
CREATE INDEX IF NOT EXISTS backup_log_instance_idx ON pgfarm.backup_log(instance_id, started_at DESC);
