CREATE schema IF NOT EXISTS pgfarm;
set search_path to pgfarm, public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS pgfarm.hostname (
  hostname_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hostname text NOT NULL UNIQUE
);