set search_path to pgfarm, public;

-- Organization
CREATE TABLE IF NOT EXISTS pgfarm.organization (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    title text NOT NULL UNIQUE,
    url text,
    description text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION pgfarm.get_organization_id(name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    oid UUID;
  BEGIN
    SELECT organization_id INTO oid FROM pgfarm.organization
    WHERE name = name_or_id OR organization_id=try_cast_uuid(name_or_id);

    IF oid IS NULL THEN
      RAISE EXCEPTION 'Organization not found: %', name_or_id;
    END IF;

    RETURN oid;
  END;
$$ LANGUAGE plpgsql;