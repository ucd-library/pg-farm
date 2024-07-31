set search_path to pgfarm, public;

DO $$ BEGIN
  CREATE TYPE pgfarm.database_event_type AS ENUM (
    'QUERY',
    'PGREST_REQUEST'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS pgfarm.database (
  database_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
  organization_id UUID NOT NULL REFERENCES pgfarm.organization(organization_id),
  name text NOT NULL,
  title text NOT NULL,
  short_description text,
  pgrest_hostname TEXT NOT NULL UNIQUE,
  description text,
  url text,
  tags text[],
  tsv_content tsvector,
  discoverable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (instance_id, name)
);
CREATE INDEX IF NOT EXISTS database_name_idx ON pgfarm.database(name);
CREATE INDEX IF NOT EXISTS database_tsv_content_idx ON pgfarm.database USING gin(tsv_content);

CREATE OR REPLACE FUNCTION database_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv_content := to_tsvector('english', CONCAT(NEW.name, ' ', NEW.title, ' ', ARRAY_TO_STRING(NEW.tags, ' '), ' ', NEW.short_description, ' ', NEW.description));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before insert or update
DO
$$BEGIN
  CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
  ON pgfarm.database FOR EACH ROW EXECUTE FUNCTION database_tsvector_trigger();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;$$;

CREATE OR REPLACE FUNCTION check_organization_id()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.organization_id != (SELECT organization_id FROM pgfarm.instance WHERE instance_id = NEW.instance_id) THEN
      RAISE EXCEPTION 'Database organization ID does not match the instance ID';
    END IF;
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER check_org_id_update_trigger
  BEFORE UPDATE ON pgfarm.database
  FOR EACH ROW
  EXECUTE FUNCTION check_organization_id();

CREATE OR REPLACE TRIGGER check_org_id_create_trigger
  BEFORE INSERT ON pgfarm.database
  FOR EACH ROW
  EXECUTE FUNCTION check_organization_id();

CREATE TABLE IF NOT EXISTS pgfarm.database_last_event (
  database_event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_id UUID NOT NULL REFERENCES pgfarm.database(database_id),
  event_type database_event_type NOT NULL,
  timestamp timestamp NOT NULL DEFAULT now(),
  UNIQUE (database_id, event_type)
);

CREATE OR REPLACE VIEW pgfarm.database_last_event_view AS
  SELECT
    dle.database_event_id,
    dle.event_type,
    dle.timestamp,
    db.name as database_name,
    db.title as database_title,
    db.database_id as database_id,
    i.name as instance_name,
    i.instance_id as instance_id,
    i.hostname as instance_hostname,
    o.name as organization_name,
    o.organization_id as organization_id
  FROM pgfarm.database_last_event dle
  JOIN pgfarm.database db ON db.database_id = dle.database_id
  JOIN pgfarm.instance i ON i.instance_id = db.instance_id
  JOIN pgfarm.organization o ON o.organization_id = i.organization_id;

CREATE OR REPLACE FUNCTION update_database_last_event(database_id_in UUID, event_type_in database_event_type)
  RETURNS UUID AS $$
  DECLARE
    eid UUID;
  BEGIN

    INSERT INTO pgfarm.database_last_event (database_id, event_type)
    VALUES (database_id_in, event_type_in)
    ON CONFLICT (database_id, event_type) DO UPDATE
    SET timestamp = now()
    RETURNING database_event_id INTO eid;

    RETURN eid;
  END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_database_id(name_or_id text, org_name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    dbid UUID;
    oid UUID;
  BEGIN

    IF org_name_or_id IS NULL THEN
      SELECT database_id INTO dbid FROM pgfarm.database
      WHERE name = name_or_id OR database_id=try_cast_uuid(name_or_id);

      IF dbid IS NULL THEN
        RAISE EXCEPTION 'Database not found: %', name_or_id;
      END IF;

    ELSE 
      SELECT pgfarm.get_organization_id(org_name_or_id) INTO oid;

      SELECT database_id INTO dbid FROM pgfarm.database
      WHERE 
        (name = name_or_id OR database_id=try_cast_uuid(name_or_id)) AND
        organization_id = oid;

      IF dbid IS NULL THEN
        RAISE EXCEPTION 'Database not found: %/%', org_name_or_id, name_or_id;
      END IF;

    END IF; 

    RETURN dbid;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW pgfarm.instance_database AS
  SELECT
    o.name as organization_name,
    o.title as organization_title,
    o.organization_id as organization_id,
    i.hostname as instance_hostname,
    i.name as instance_name,
    i.state as instance_state,
    i.instance_id as instance_id,
    i.port as instance_port,
    db.name as database_name,
    db.title as database_title,
    db.short_description as database_short_description,
    db.description as database_description,
    db.url as database_url,
    db.tags as database_tags,
    db.pgrest_hostname as pgrest_hostname,
    db.database_id as database_id,
    db.tsv_content as tsv_content
  FROM pgfarm.database db
  LEFT JOIN pgfarm.instance i ON i.instance_id = db.instance_id
  LEFT JOIN pgfarm.organization o ON o.organization_id = i.organization_id;

CREATE TABLE IF NOT EXISTS pgfarm.pg_rest_config (
    pg_rest_config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    name text NOT NULL,
    value text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

