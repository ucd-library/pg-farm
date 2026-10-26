set search_path to pgfarm, public;

-- Optional override so a specific organization's backups can be written to a bucket
-- owned by a different GCP project. Falls back to config.backup.bucket when NULL.
ALTER TABLE pgfarm.organization ADD COLUMN IF NOT EXISTS backup_bucket text;
