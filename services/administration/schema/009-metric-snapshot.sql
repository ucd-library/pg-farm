set search_path to pgfarm, public;

-- Part A: shared Prometheus metric snapshot table.  Every metrics-enabled process
-- periodically upserts its current metric values here; administration reads this
-- table to render a single Prometheus /metrics page across all pg-farm processes.
CREATE TABLE IF NOT EXISTS pgfarm.metric_snapshot (
    service_instance_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    help_text TEXT NOT NULL,
    labels_key TEXT NOT NULL,
    labels JSONB NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    updated_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (service_instance_id, metric_name, labels_key)
);
CREATE INDEX IF NOT EXISTS metric_snapshot_updated_at_idx ON pgfarm.metric_snapshot(updated_at);

CREATE OR REPLACE FUNCTION pgfarm.upsert_metric_snapshot(
    instance_id_in TEXT,
    name_in TEXT,
    type_in TEXT,
    help_in TEXT,
    labels_key_in TEXT,
    labels_in JSONB,
    value_in DOUBLE PRECISION
) RETURNS void AS $$
BEGIN
    INSERT INTO pgfarm.metric_snapshot
      (service_instance_id, metric_name, metric_type, help_text, labels_key, labels, value)
    VALUES
      (instance_id_in, name_in, type_in, help_in, labels_key_in, labels_in, value_in)
    ON CONFLICT (service_instance_id, metric_name, labels_key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pgfarm.purge_stale_metric_snapshots(older_than_in INTERVAL)
RETURNS void AS $$
BEGIN
    DELETE FROM pgfarm.metric_snapshot WHERE updated_at < now() - older_than_in;
END;
$$ LANGUAGE plpgsql;

-- Part B: bytes_ingress/bytes_egress columns and the connection_view update live in
-- 006-connection.sql (they belong alongside pgfarm.connection's own definition).
CREATE OR REPLACE FUNCTION pgfarm.update_connection_bytes(
    ses_id_in TEXT,
    bytes_ingress_in BIGINT,
    bytes_egress_in BIGINT
) RETURNS void AS $$
BEGIN
    UPDATE pgfarm.connection
    SET bytes_ingress = bytes_ingress_in, bytes_egress = bytes_egress_in
    WHERE session_id = ses_id_in;
END;
$$ LANGUAGE plpgsql;
