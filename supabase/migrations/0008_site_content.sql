-- Conteúdo editável do site público (CMS › Página inicial) e imagens do site.
-- content guarda o JSON da página (textos, botões, números, seções); os bytes
-- das imagens ficam em site_images e são servidos em /api/site-images/:id.
create table if not exists site_content (
  id varchar(64) primary key,
  content text not null default '{}',
  updated_at timestamptz(3) not null default now()
);

-- image_data nunca entra em tableColumns (ver src/integrations/mysql/tables.ts).
create table if not exists site_images (
  id text primary key default gen_random_uuid()::text,
  slot varchar(40) not null,
  mime_type varchar(100) not null,
  width int not null,
  height int not null,
  byte_size int not null,
  image_data bytea not null,
  created_at timestamptz(3) not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['site_content', 'site_images'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
end $$;
