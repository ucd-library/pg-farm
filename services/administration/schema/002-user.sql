set search_path to pgfarm, public;

CREATE TABLE IF NOT EXISTS pgfarm.user (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username text NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pgfarm.user_email (
    user_email_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pgfarm.user(user_id),
    email text NOT NULL UNIQUE
);

CREATE FUNCTION IF NOT EXISTS pgfarm.get_user(username_in text) 
  RETURNS UUID AS $$
  DECLARE
    uid UUID;
  BEGIN
    SELECT user_id INTO uid FROM pgfarm.user WHERE username = username_in;
    IF user_id IS NULL THEN
      RAISE EXCEPTION 'User not found: %', username_in;
    END IF;
    RETURN uid;
  END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION IF NOT EXISTS pgfarm.ensure_user(username_in text) 
  RETURNS UUID AS $$
  DECLARE
    uid UUID;
  BEGIN
    SELECT user_id INTO uid FROM pgfarm.user WHERE username = username_in;
    IF user_id IS NULL THEN
      INSERT INTO pgfarm.user (username) VALUES (username_in) RETURNING user_id INTO user_id;
    END IF;
    RETURN uid;
  END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS pgfarm.user_token (
    login_token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES pgfarm.user(user_id),
    token text NOT NULL UNIQUE,
    hash text NOT NULL,
    expires timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_token_hash_idx ON pgfarm.user_token(hash);

CREATE FUNCTION IF NOT EXISTS pgfarm.add_user_token(username_in text, token_in text, hash_in text, expires_in timestamp) 
  RETURNS void AS $$
  DECLARE
    uid UUID;
  BEGIN
    SELECT pgfarm.ensure_user(username_in) INTO uid;
    INSERT INTO pgfarm.user_token (user_id, token, hash, expires) VALUES (uid, token_in, hash_in, expires_in);
  END;
$$ LANGUAGE plpgsql;