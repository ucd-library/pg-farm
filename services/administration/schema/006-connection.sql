set search_path to pgfarm, public;


CREATE TABLE IF NOT EXISTS pgfarm.connection (
    session_id UUID PRIMARY KEY,
    database_id UUID REFERENCES pgfarm.database(database_id),
    user_id UUID REFERENCES pgfarm.user(user_id),
    ip_address inet NOT NULL,
    connection_data jsonb NOT NULL,
    opened_at timestamp NOT NULL,
    closed_at timestamp
);
CREATE INDEX IF NOT EXISTS connection_database_id_idx ON pgfarm.connection(database_id);

CREATE OR REPLACE FUNCTION pgfarm.connection_open(
    ses_id_in UUID,
    dbname_in text,
    organization_in text,
    user_in text,
    ip_in inet,
    data_in jsonb,
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
      pgfarm.connection(session_id, database_id, user_id, ip_address, connection_data, opened_at)
    VALUES 
      (ses_id_in, db_id, user_id, ip_in, data_in, opened_at_in);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pgfarm.connection_close(
    ses_id_in UUID,
    closed_at_in timestamp
) RETURNS void AS $$
BEGIN
    UPDATE pgfarm.connection SET closed_at = closed_at_in WHERE session_id = ses_id_in;
END;
$$ LANGUAGE plpgsql;
