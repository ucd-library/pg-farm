set search_path to pgfarm, public;

CREATE TABLE IF NOT EXISTS pgfarm.service_account (
  service_account_id UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID      NOT NULL REFERENCES pgfarm.user(user_id),
  parent_user_id     UUID      NOT NULL REFERENCES pgfarm.user(user_id),
  last_rotated_at    timestamp,
  created_at         timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS service_account_parent_user_idx ON pgfarm.service_account(parent_user_id);

CREATE OR REPLACE FUNCTION pgfarm.get_service_accounts_for_user(parent_username_in text)
  RETURNS TABLE (
    service_account_id UUID,
    username           text,
    last_rotated_at    timestamp,
    created_at         timestamp
  ) AS $$
  DECLARE
    puid UUID;
  BEGIN
    SELECT pgfarm.get_user_id(parent_username_in) INTO puid;
    RETURN QUERY
      SELECT sa.service_account_id, u.username, sa.last_rotated_at, sa.created_at
      FROM pgfarm.service_account sa
      JOIN pgfarm.user u ON u.user_id = sa.user_id
      WHERE sa.parent_user_id = puid
      ORDER BY sa.created_at;
  END;
$$ LANGUAGE plpgsql;
