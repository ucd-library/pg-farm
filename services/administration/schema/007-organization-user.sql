CREATE OR REPLACE VIEW pgfarm.organization_user AS
  WITH base AS (
    SELECT
      o.organization_id,
      o.name as organization_name,
      i.instance_id as instance_id,
      i.name as instance_name,
      iu.instance_user_id,
      iu.type as user_type,
      u.username
    FROM pgfarm.instance i
    LEFT JOIN pgfarm.organization o ON o.organization_id = i.organization_id
    RIGHT JOIN pgfarm.instance_user iu ON iu.instance_id = i.instance_id
    LEFT JOIN pgfarm.user u ON u.user_id = iu.user_id
  )
  SELECT 
    base.*,
    ARRAY_AGG(db.name) as databases
  FROM base
  LEFT JOIN pgfarm.database db ON db.instance_id = base.instance_id
  GROUP BY base.organization_id, base.organization_name, base.instance_id, 
    base.instance_name, base.instance_user_id, base.user_type, base.username;


CREATE OR REPLACE FUNCTION pgfarm.is_org_admin(username_in text, org_name text)
  RETURNS BOOLEAN AS $$
  DECLARE
    ut instance_user_type;
  BEGIN
    SELECT 
      user_type INTO ut 
    FROM pgfarm.organization_users
    WHERE 
      organization_name = org_name AND
      username = username_in AND 
      user_type = 'ADMIN';

    IF ut IS NULL THEN
      RETURN FALSE;
    END IF;

    RETURN TRUE;
  END;
$$ LANGUAGE plpgsql;