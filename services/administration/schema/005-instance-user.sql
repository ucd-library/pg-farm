set search_path to pgfarm, public;

CREATE TABLE IF NOT EXISTS pgfarm.instance_user (
    instance_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES pgfarm.instance(instance_id),
    user_id UUID NOT NULL REFERENCES pgfarm.user(user_id),
    password text NOT NULL,
    type instance_user_type NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (instance_id, user_id)
);
CREATE INDEX IF NOT EXISTS instance_user_username_idx ON pgfarm.instance_user(user_id);

CREATE OR REPLACE FUNCTION get_instance_user_id(username_or_id text, inst_name_or_id text, org_name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    uid UUID;
    iid UUID;
  BEGIN

    SELECT pgfarm.get_instance_id(inst_name_or_id, org_name_or_id) INTO iid;
    SELECT pgfarm.get_user_id(username_or_id, iid) INTO uid;

    SELECT instance_user_id INTO uid FROM pgfarm.instance_user
      WHERE user_id = uid AND instance_id = iid;

    RETURN uid;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_instance_user_id_for_db(username_or_id text, db_name_or_id text, org_name_or_id text)
  RETURNS UUID AS $$
  DECLARE
    dbid UUID;
    uid UUID;
    iid UUID;
  BEGIN

    SELECT pgfarm.get_database_id(db_name_or_id, org_name_or_id) INTO dbid;
    SELECT instance_id INTO iid from pgfarm.database WHERE database_id = dbid;
    SELECT pgfarm.get_user_id(username_or_id, iid) INTO uid;

    SELECT instance_user_id INTO uid FROM pgfarm.instance_user
      WHERE user_id = uid AND instance_id = iid;

    RETURN uid;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_instance_user(inst_name_or_id text, org_name_or_id text, username_in text, password_in text, type_in instance_user_type)
  RETURNS UUID AS $$
  DECLARE
    uid UUID;
    iid UUID;
    iuid UUID;
  BEGIN

    SELECT pgfarm.get_instance_id(inst_name_or_id, org_name_or_id) INTO iid;
    SELECT pgfarm.ensure_user(username_in) INTO uid;

    INSERT INTO pgfarm.instance_user 
      (instance_id, user_id, password, type) 
    VALUES 
      (iid, uid, password_in, type_in)
    RETURNING instance_user_id INTO iuid;

    RETURN iuid;
  END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW pgfarm.instance_database_user AS
  SELECT
    o.name as organization_name,
    o.title as organization_title,
    o.organization_id as organization_id,
    i.hostname as instance_hostname,
    i.port as instance_port,
    i.instance_id as instance_id,
    i.name as instance_name,
    db.name as database_name,
    db.title as database_title,
    db.database_id as database_id,
    iu.instance_user_id,
    u.username,
    iu.password,
    iu.type as user_type
  FROM pgfarm.instance i
  LEFT JOIN pgfarm.organization o ON o.organization_id = i.organization_id
  LEFT JOIN pgfarm.instance_user iu ON iu.instance_id = i.instance_id
  LEFT JOIN pgfarm.user u ON u.user_id = iu.user_id
  LEFT JOIN pgfarm.database db ON db.instance_id = i.instance_id;