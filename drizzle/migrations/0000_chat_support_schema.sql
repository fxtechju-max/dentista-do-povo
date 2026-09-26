create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_first_user_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_make_admin
  after insert on auth.users
  for each row execute function public.handle_first_user_admin();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
grant select, insert on public.conversations to anon;
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "Anyone can create a conversation" on public.conversations for insert to anon with check (true);
create policy "Anyone can read conversations" on public.conversations for select to anon using (true);
create policy "Admins can update conversations" on public.conversations for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete conversations" on public.conversations for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender text not null check (sender in ('visitor', 'admin')),
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to anon;
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Visitors can send messages" on public.messages for insert to anon with check (sender = 'visitor');
create policy "Anyone can read messages" on public.messages for select to anon using (true);
create policy "Admins can send messages" on public.messages for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;
create trigger on_message_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

alter publication supabase_realtime add table public.messages;