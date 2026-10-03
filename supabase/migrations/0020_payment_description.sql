-- Caixa (PDV): o lançamento guarda o que foi vendido ("2x Restauração; Limpeza").
alter table payments add column if not exists description text;
