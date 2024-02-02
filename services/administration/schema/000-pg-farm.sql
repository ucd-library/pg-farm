CREATE schema IF NOT EXISTS pgfarm;
set search_path to pgfarm, public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CREATE TYPE pgfarm.port_type AS ENUM (
--   'TCP_DB_SOCKET',
--   'HTTP_PG_REST'
-- );

create or replace function public.try_cast_uuid(p_in text)
   returns UUID
as
$$
begin
  begin
    return $1::UUID;
  exception 
    when others then
       return '00000000-0000-0000-0000-000000000000'::UUID;
  end;
end;
$$
language plpgsql;

DO $$ BEGIN
  CREATE TYPE pgfarm.database_user_type AS ENUM (
    'PUBLIC',
    'USER',
    'ADMIN',
    'PGREST'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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
  CREATE TYPE pgfarm.instance_availability AS ENUM (
    'ALWAYS', -- Never turn off
    'HIGH', -- Month
    'MEDIUM', -- 1 Week
    'LOW' -- 1 Day
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization
CREATE TABLE IF NOT EXISTS pgfarm.organization (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    url text,
    description text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Instance
CREATE TABLE IF NOT EXISTS pgfarm.instance (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text,
    hostname text NOT NULL UNIQUE,
    description text,
    port integer NOT NULL DEFAULT 5432,
    state instance_state NOT NULL DEFAULT 'CREATING',
    avability instance_availability NOT NULL DEFAULT 'LOW',
    organization_id UUID REFERENCES pgfarm.organization(organization_id),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (name, organization_id)
);
CREATE INDEX IF NOT EXISTS instance_name_idx ON pgfarm.instance(name);


CREATE TABLE IF NOT EXISTS pgfarm.database (
    database_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES pgfarm.organization(organization_id),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    name text NOT NULL,
    short_description text,
    description text,
    tags text[],
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),
    UNIQUE (instance_id, name)
);

CREATE OR REPLACE VIEW pgfarm.instance_database AS
  SELECT
    o.name as organization_name,
    o.organization_id as organization_id,
    i.hostname as instance_hostname,
    i.instance_id as instance_id,
    db.name as database_name,
    db.database_id as database_id,
    db.port as database_port,
    db.database_created_at,
    db.database_updated_at
  FROM pgfarm.database db
  LEFT JOIN pgfarm.instance i ON i.instance_id = db.instance_id
  LEFT JOIN pgfarm.organization o ON o.organization_id = i.organization_id;

-- CREATE OR REPLACE FUNCTION update_instance_updated_at()
--   RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_instance_updated_at_trigger
--   BEFORE UPDATE ON pgfarm.instance
--   FOR EACH ROW
--   EXECUTE FUNCTION update_instance_updated_at();

CREATE TABLE IF NOT EXISTS pgfarm.database_user (
    database_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    database_id UUID NOT NULL REFERENCES pgfarm.database(database_id),
    username text NOT NULL,
    password text NOT NULL,
    type database_user_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (database_id, username)
);
CREATE INDEX IF NOT EXISTS database_user_username_idx ON pgfarm.database_user(username);

CREATE TABLE IF NOT EXISTS pgfarm.user_token (
    login_token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token text NOT NULL UNIQUE,
    hash text NOT NULL,
    expires timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_token_hash_idx ON pgfarm.user_token(hash);

CREATE OR REPLACE VIEW pgfarm.instance_database_user AS
  SELECT
    o.name as organization_name,
    o.organization_id as organization_id,
    i.hostname as instance_hostname,
    i.instance_id as instance_id,
    db.name as database_name,
    db.database_id as database_id,
    db.port as database_port,
    u.database_user_id,
    u.username,
    u.password,
    u.type,
    u.created_at,
    u.updated_at
  FROM pgfarm.database_user u
  LEFT JOIN pgfarm.database db ON db.database_id = u.database_id
  LEFT JOIN pgfarm.instance i ON i.instance_id = db.instance_id
  LEFT JOIN pgfarm.organization o ON o.organization_id = i.organization_id;

CREATE TABLE IF NOT EXISTS pgfarm.pg_rest_config (
    pg_rest_config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    database_id UUID NOT NULL REFERENCES pgfarm.instance(database_id),
    name text NOT NULL,
    value text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

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
  DELETE FROM pgfarm.database_user WHERE instance_id = iid;
  DELETE FROM pgfarm.pg_rest_config WHERE instance_id = iid;
  DELETE FROM pgfarm.k8s_config_property WHERE instance_id = iid;
  DELETE FROM pgfarm.instance WHERE instance_id = iid;
END;
$$
LANGUAGE plpgsql;