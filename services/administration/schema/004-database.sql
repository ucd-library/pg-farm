set search_path to pgfarm, public;

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
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (instance_id, name)
);
CREATE INDEX IF NOT EXISTS database_name_idx ON pgfarm.database(name);

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


CREATE OR REPLACE FUNCTION get_database_id(name_or_id text, org_name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    dbid UUID;
    oid UUID;
  BEGIN

    IF org_name_or_id IS NULL THEN
      SELECT database_id INTO dbid FROM pgfarm.database
      WHERE name = name_or_id OR instance_id=try_cast_uuid(name_or_id);

      IF dbid IS NULL THEN
        RAISE EXCEPTION 'Database not found: %', name_or_id;
      END IF;

    ELSE 
      SELECT pgfarm.get_organization_id(org_name_or_id) INTO oid;

      SELECT database_id INTO dbid FROM pgfarm.database
      WHERE 
        (name = name_or_id OR instance_id=try_cast_uuid(name_or_id)) AND
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
    i.instance_id as instance_id,
    i.port as instance_port,
    db.name as database_name,
    db.title as database_title,
    db.pgrest_hostname as pgrest_hostname,
    db.database_id as database_id
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

