-- Formas de pagamento no Financeiro e em Contas a Pagar/Receber, com a
-- lista de formas desativadas pela clínica (Configurações › Formas de pagamento).
alter table payments add column if not exists payment_method varchar(40);
alter table payments add column if not exists installments smallint
  check (installments is null or installments between 1 and 48);
alter table finance_entries add column if not exists payment_method varchar(40);
alter table finance_entries add column if not exists installments smallint
  check (installments is null or installments between 1 and 48);
alter table clinic_settings add column if not exists disabled_payment_methods jsonb
  not null default '[]'::jsonb;
