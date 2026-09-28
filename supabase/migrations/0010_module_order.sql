-- Ordem dos módulos do painel, definida arrastando na tela inicial.
-- Salva no projeto (clinic_settings), vale para todos os admins e aparelhos.
alter table clinic_settings add column if not exists module_order jsonb
  not null default '[]'::jsonb;
