-- Orçamento finalizado no Caixa (PDV) ou lançado no Financeiro fica ligado ao
-- pagamento: assim não é cobrado duas vezes.
alter table budgets add column if not exists payment_id text references payments(id) on delete set null;
create index if not exists idx_budgets_payment on budgets (payment_id);
