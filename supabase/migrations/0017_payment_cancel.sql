-- Financeiro: cancelamento com justificativa, valor devolvido e quem cancelou
-- (confirmado com a senha do administrador).
alter table payments add column if not exists cancel_reason text;
alter table payments add column if not exists refund_amount numeric(10, 2) check (refund_amount >= 0);
alter table payments add column if not exists cancelled_at timestamptz(3);
alter table payments add column if not exists cancelled_by text;
