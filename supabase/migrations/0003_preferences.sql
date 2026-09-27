-- Preferências de interface (tema, zoom, modo de visualização) salvas no
-- servidor por usuário/visitante, em vez de no navegador.
create table if not exists preferences (
  owner varchar(191) not null,
  key varchar(64) not null,
  value jsonb not null,
  updated_at timestamptz(3) not null default now(),
  primary key (owner, key)
);

alter table preferences enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table preferences from anon, authenticated;
  end if;
end $$;
