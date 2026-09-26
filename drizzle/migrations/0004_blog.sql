-- Public blog: admins write posts from the restricted area (CMS Site), the
-- public site reads only published ones.
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
alter table public.blog_posts enable row level security;
create policy "Anyone can read published posts" on public.blog_posts for select to anon
  using (status = 'publicado');
create policy "Admins can manage posts" on public.blog_posts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_blog_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger on_blog_post_update
  before update on public.blog_posts
  for each row execute function public.touch_blog_post();
