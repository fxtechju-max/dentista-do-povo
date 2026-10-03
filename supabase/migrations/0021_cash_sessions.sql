-- Caixa do dia (PDV): abertura com fundo de troco, sangrias/suprimentos e
-- fechamento com conferência do dinheiro. Só um caixa aberto por vez.
create table if not exists cash_sessions (
  id text primary key default gen_random_uuid()::text,
  status varchar(10) not null default 'aberto' check (status in ('aberto', 'fechado')),
  opened_at timestamptz(3) not null default now(),
  opened_by text,
  opening_amount numeric(10, 2) not null default 0 check (opening_amount >= 0),
  opening_notes text,
  closed_at timestamptz(3),
  closed_by text,
  expected_cash numeric(10, 2),
  counted_cash numeric(10, 2),
  difference numeric(10, 2),
  total_sales numeric(10, 2),
  closing_notes text,
  created_at timestamptz(3) not null default now()
);
create unique index if not exists idx_cash_sessions_one_open on cash_sessions (status) where status = 'aberto';
create index if not exists idx_cash_sessions_opened on cash_sessions (opened_at);

create table if not exists cash_movements (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references cash_sessions(id) on delete cascade,
  type varchar(12) not null check (type in ('sangria', 'suprimento')),
  amount numeric(10, 2) not null check (amount > 0),
  reason text,
  created_by text,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_cash_movements_session on cash_movements (session_id);

alter table payments add column if not exists cash_session_id text references cash_sessions(id) on delete set null;
create index if not exists idx_payments_cash_session on payments (cash_session_id);

do $$
declare t text;
begin
  foreach t in array array['cash_sessions', 'cash_movements'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
end $$;
