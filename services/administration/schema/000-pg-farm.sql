CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE schema IF NOT EXISTS pgfarm;
set search_path to pgfarm, public;

CREATE TYPE pgfarm.port_type AS ENUM (
  'TCP_DB_SOCKET',
  'HTTP_PG_REST'
);

CREATE TYPE pgfarm.instance_user_type AS ENUM (
  'PG',
  'PG_REST'
);

-- Instance
CREATE TABLE IF NOT EXISTS pgfarm.instance (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    hostname text NOT NULL UNIQUE,
    description text,
    port integer NOT NULL DEFAULT 5432,
    pgrest_port integer NOT NULL DEFAULT 3000,
    pgrest_username text NOT NULL,
    organization_id UUID NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS instance_name_idx ON pgfarm.instance(name);


CREATE OR REPLACE FUNCTION update_instance_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instance_updated_at_trigger
  BEFORE UPDATE ON pgfarm.instance
  FOR EACH ROW
  EXECUTE FUNCTION update_instance_updated_at();

-- Port configuration
-- CREATE TABLE IF NOT EXISTS pgfarm.port_configuration (
--     port_configuration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
--     port integer NOT NULL UNIQUE,
--     type port_type NOT NULL,
--     created_at timestamp NOT NULL DEFAULT now(),
--     updated_at timestamp NOT NULL DEFAULT now()
-- );

CREATE TABLE IF NOT EXISTS pgfarm.database_user (
    database_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_database_id UUID NOT NULL REFERENCES pgfarm.instance_database(instance_database_id),
    username text NOT NULL,
    password text NOT NULL,
    type instance_user_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE VIEW IF NOT EXISTS pgfarm.instance_database_user AS
  SELECT
    db.name as database_name,
    db.hostname as database_hostname,
    db.port as database_port,
    u.database_user_id,
    u.instance_database_id,
    u.username,
    u.password,
    u.type,
    u.created_at,
    u.updated_at
  FROM pgfarm.database_user u
  LEFT JOIN pgfarm.instance_database db ON db.instance_database_id = u.instance_database_id;

CREATE TABLE IF NOT EXISTS pgfarm.pg_rest_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    name text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pgfarm.k8s_config_property (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pgfarm.instance(id),
  name text NOT NULL,
  value text NOT NULL
);