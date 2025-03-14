set search_path to pgfarm, public;

CREATE TABLE IF NOT EXISTS pgfarm.connection (
    session_id TEXT PRIMARY KEY,
    database_id UUID REFERENCES pgfarm.database(database_id),
    user_id UUID REFERENCES pgfarm.user(user_id),
    ip_address inet NOT NULL,
    connection_data jsonb NOT NULL,
    gateway_id UUID NOT NULL,
    opened_at timestamp NOT NULL DEFAULT now(),
    closed_at timestamp
);
CREATE INDEX IF NOT EXISTS connection_database_id_idx ON pgfarm.connection(database_id);
CREATE INDEX IF NOT EXISTS connection_user_id_idx ON pgfarm.connection(user_id);
CREATE INDEX IF NOT EXISTS connection_opened_at_idx ON pgfarm.connection(opened_at);
CREATE INDEX IF NOT EXISTS connection_closed_at_idx ON pgfarm.connection(closed_at);

CREATE TABLE IF NOT EXISTS pgfarm.connection_event (
    connection_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT REFERENCES pgfarm.connection(session_id),
    type TEXT NOT NULL,
    message TEXT,
    timestamp timestamp NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION pgfarm.add_connection_event(
    ses_id_in TEXT,
    type_in TEXT,
    message_in TEXT
) RETURNS void AS $$
BEGIN

  -- Check if the session_id exists in the pgfarm.connection table
    IF EXISTS (SELECT 1 FROM pgfarm.connection WHERE session_id = ses_id_in) THEN
      INSERT INTO
        pgfarm.connection_event(session_id, type, message)
      VALUES
        (ses_id_in, type_in, message_in);
    ELSE
        RAISE INFO 'Ignoring connection event insert type=%, message=%. Session ID=% does not exist in pgfarm.connection,', type_in, message_in, ses_id_in;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW pgfarm.connection_view AS
  SELECT
    c.session_id,
    c.database_id,
    c.user_id,
    c.ip_address,
    c.connection_data,
    c.opened_at,
    c.closed_at,
    d.name as database_name,
    i.name as instance_name,
    o.name as organization_name,
    u.username as username
  FROM pgfarm.connection c
  JOIN pgfarm.database d ON d.database_id = c.database_id
  JOIN pgfarm.instance i ON i.instance_id = d.instance_id
  JOIN pgfarm.organization o ON o.organization_id = i.organization_id
  JOIN pgfarm.user u ON u.user_id = c.user_id;

CREATE OR REPLACE FUNCTION pgfarm.connection_open(
    ses_id_in text,
    dbname_in text,
    organization_in text,
    user_in text,
    ip_in inet,
    data_in jsonb,
    gateway_id_in UUID,
    opened_at_in timestamp
) RETURNS void AS $$
DECLARE
    db_id UUID;
    user_id UUID;
    con_id UUID;
BEGIN

    IF ses_id_in IS NULL THEN
      RAISE EXCEPTION 'Session ID is required';
    END IF;

    IF opened_at_in IS NULL THEN
      RAISE EXCEPTION 'Opened at time is required';
    END IF;

    IF gateway_id_in IS NULL THEN
      RAISE EXCEPTION 'Gateway ID is required';
    END IF;

    IF ip_in IS NULL THEN
      RAISE EXCEPTION 'IP Address is required';
    END IF;

    BEGIN
      SELECT get_database_id(dbname_in, organization_in) into db_id;
    EXCEPTION
      WHEN OTHERS THEN
        db_id := NULL;
    END;

    BEGIN
      SELECT get_user_id(user_in) into user_id;
    EXCEPTION
      WHEN OTHERS THEN
        user_id := NULL;
    END;


    INSERT INTO
      pgfarm.connection(session_id, database_id, user_id, ip_address, connection_data, gateway_id, opened_at)
    VALUES
      (ses_id_in, db_id, user_id, ip_in, data_in, gateway_id_in, opened_at_in);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pgfarm.connection_close(
    ses_id_in TEXT,
    closed_at_in timestamp
) RETURNS void AS $$
BEGIN
    UPDATE pgfarm.connection SET closed_at = closed_at_in WHERE session_id = ses_id_in;
END;
$$ LANGUAGE plpgsql;
