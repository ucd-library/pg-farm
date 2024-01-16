CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE schema IF NOT EXISTS pg_farm;
set search_path to pg_farm, public;

CREATE TYPE pg_farm.port_type AS ENUM (
  'TCP_DB_SOCKET',
  'HTTP_PG_REST'
);

CREATE TYPE pg_farm.instance_user_type AS ENUM (
  'UNIX_SOCKET',
  'PG_REST'
);

-- Instance
CREATE TABLE IF NOT EXISTS pg_farm.instance (
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

CREATE OR REPLACE FUNCTION update_instance_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instance_updated_at_trigger
  BEFORE UPDATE ON pg_farm.instance
  FOR EACH ROW
  EXECUTE FUNCTION update_instance_updated_at();

-- Port configuration
CREATE TABLE IF NOT EXISTS pg_farm.port_configuration (
    port_configuration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pg_farm.instance(instance_id),
    port integer NOT NULL UNIQUE,
    type port_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pg_farm.database_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_database_id UUID NOT NULL REFERENCES pg_farm.instance_database(instance_database_id),
    username text NOT NULL,
    password text NOT NULL,
    type instance_user_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pg_farm.pg_rest_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pg_farm.instance(instance_id),
    name text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pg_farm.k8s_config_property (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES pg_farm.instance(id),
  name text NOT NULL,
  value text NOT NULL
);