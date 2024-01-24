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
  CREATE TYPE pgfarm.instance_user_type AS ENUM (
    'PUBLIC',
    'USER',
    'ADMIN',
    'PGREST' -- TODO: Remove this.  Should just be the public role.
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization
CREATE TABLE IF NOT EXISTS pgfarm.organization (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Instance
CREATE TABLE IF NOT EXISTS pgfarm.instance (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    hostname text NOT NULL UNIQUE,
    description text,
    tags text[],
    port integer NOT NULL DEFAULT 5432,
    organization_id UUID REFERENCES pgfarm.organization(organization_id),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS instance_name_idx ON pgfarm.instance(name);


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
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    username text NOT NULL,
    password text NOT NULL,
    type instance_user_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (instance_id, username)
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
    db.name as database_name,
    db.hostname as database_hostname,
    db.port as database_port,
    u.database_user_id,
    u.instance_id,
    u.username,
    u.password,
    u.type,
    u.created_at,
    u.updated_at
  FROM pgfarm.database_user u
  LEFT JOIN pgfarm.instance db ON db.instance_id = u.instance_id;

CREATE TABLE IF NOT EXISTS pgfarm.pg_rest_config (
    pg_rest_config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    name text NOT NULL,
    value text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pgfarm.k8s_config_property (
  k8s_config_property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
  name text NOT NULL,
  value text NOT NULL
);