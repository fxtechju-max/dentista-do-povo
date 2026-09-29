-- Plano de tratamento do odontograma: valor de cada procedimento planejado e
-- o orçamento gerado a partir dele (Orçamentos).
alter table tooth_procedures add column if not exists price numeric(10, 2) check (price >= 0);
alter table tooth_procedures add column if not exists budget_id text references budgets(id) on delete set null;
create index if not exists idx_tooth_procedures_budget on tooth_procedures (budget_id);
