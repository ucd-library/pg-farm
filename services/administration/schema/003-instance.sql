set search_path to pgfarm, public;

DO $$ BEGIN
  CREATE TYPE pgfarm.instance_state AS ENUM (
    'CREATING',
    'RUN',
    'SLEEP',
    'ARCHIVE',
    'ARCHIVING',
    'RESTORING'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pgfarm.instance_user_type AS ENUM (
    'PUBLIC',
    'USER',
    'ADMIN',
    'PGREST'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE pgfarm.instance_availability AS ENUM (
    'ALWAYS', -- Never turn off
    'HIGH', -- Month
    'MEDIUM', -- 1 Week
    'LOW' -- 1 Day
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Instance
CREATE TABLE IF NOT EXISTS pgfarm.instance (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    hostname text NOT NULL UNIQUE,
    description text,
    port integer NOT NULL DEFAULT 5432,
    state instance_state NOT NULL DEFAULT 'CREATING',
    availability instance_availability NOT NULL DEFAULT 'LOW',
    organization_id UUID REFERENCES pgfarm.organization(organization_id),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (name, organization_id)
);
CREATE INDEX IF NOT EXISTS instance_name_idx ON pgfarm.instance(name);

CREATE TABLE IF NOT EXISTS pgfarm.instance_state_history (
  instance_state_history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
  state instance_state NOT NULL,
  timestamp timestamp NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_instance_state_history()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO pgfarm.instance_state_history(instance_id, state)
    VALUES (OLD.instance_id, OLD.state);
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_instance_state_history_trigger
  BEFORE UPDATE ON pgfarm.instance
  FOR EACH ROW
  EXECUTE FUNCTION update_instance_state_history();

CREATE OR REPLACE FUNCTION get_instance_id(name_or_id text, org_name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    oid UUID;
    iid UUID;
  BEGIN

    IF org_name_or_id IS NULL THEN
      SELECT instance_id INTO iid FROM pgfarm.instance
      WHERE name = name_or_id OR instance_id=try_cast_uuid(name_or_id);

      IF iid IS NULL THEN
        RAISE EXCEPTION 'Instance not found: %', name_or_id;
      END IF;

    ELSE 
      SELECT pgfarm.get_organization_id(org_name_or_id) INTO oid;

      SELECT instance_id INTO iid FROM pgfarm.instance
      WHERE 
        (name = name_or_id OR instance_id=try_cast_uuid(name_or_id)) AND
        organization_id = oid;

      IF iid IS NULL THEN
        RAISE EXCEPTION 'Instance not found: %/%', org_name_or_id, name_or_id;
      END IF;

    END IF;    

    RETURN iid;
  END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS pgfarm.k8s_config_property (
  k8s_config_property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
  name text NOT NULL,
  value text NOT NULL,
  UNIQUE(instance_id, name)
);

CREATE OR REPLACE FUNCTION pgfarm.remove_instance(name_in text)
  RETURNS void AS
$$
DECLARE
  iid UUID;
BEGIN
  SELECT instance_id INTO iid FROM pgfarm.instance WHERE name = name_in;
  DELETE FROM pgfarm.database WHERE instance_id = iid;
  DELETE FROM pgfarm.instance_user WHERE instance_id = iid;
  DELETE FROM pgfarm.pg_rest_config WHERE instance_id = iid;
  DELETE FROM pgfarm.k8s_config_property WHERE instance_id = iid;
  DELETE FROM pgfarm.instance WHERE instance_id = iid;
END;
$$
LANGUAGE plpgsql;