-- Modelos de documentos (receituário, atestado, declaração...) e dados do
-- profissional usados no cabeçalho/rodapé dos documentos impressos.

alter table clinic_settings add column if not exists dentist_name text;
alter table clinic_settings add column if not exists dentist_cro text;
alter table clinic_settings add column if not exists clinic_email text;
alter table clinic_settings add column if not exists clinic_city text;

insert into clinic_settings (id) values ('default') on conflict (id) do nothing;

-- Preenche só o que ainda estiver vazio: nunca sobrescreve dados já salvos.
update clinic_settings set
  clinic_name = coalesce(nullif(clinic_name, ''), 'Dentista do Povo'),
  dentist_name = coalesce(nullif(dentist_name, ''), 'Dr. Álvaro Augusto Battiston'),
  dentist_cro = coalesce(nullif(dentist_cro, ''), 'CRO/RO 2853'),
  phone = coalesce(nullif(phone, ''), '(69) 98492-0788'),
  whatsapp_number = coalesce(nullif(whatsapp_number, ''), '(69) 98492-0788'),
  address = coalesce(nullif(address, ''), 'Avenida Cujubim, nº 2112, Setor 02, Cujubim - RO, CEP 76864-000'),
  clinic_city = coalesce(nullif(clinic_city, ''), 'Cujubim - RO')
where id = 'default';

create table if not exists document_templates (
  id text primary key default gen_random_uuid()::text,
  kind varchar(40) not null default 'personalizado',
  name text not null,
  title text not null,
  body text not null,
  layout varchar(20) not null default 'classico'
    check (layout in ('classico', 'moderno', 'elegante')),
  sort_order int not null default 0,
  created_at timestamptz(3) not null default now(),
  updated_at timestamptz(3) not null default now()
);

insert into document_templates (id, kind, name, title, body, layout, sort_order) values
(
  'modelo-receituario', 'receituario', 'Receituário', 'Receituário',
  E'Paciente: {{paciente_nome}}\n\nUso oral\n\n1. ______________________________________________\n   ______________________________________________\n\n2. ______________________________________________\n   ______________________________________________\n\n3. ______________________________________________\n   ______________________________________________',
  'classico', 1
),
(
  'modelo-atestado', 'atestado', 'Atestado', 'Atestado',
  E'Atesto, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, residente à {{paciente_endereco}}, esteve sob meus cuidados profissionais no período das ____ às ____ horas do dia {{data}}, necessitando o(a) mesmo(a) de ____ dia(s) de convalescença.\n\nCID: __________',
  'moderno', 2
),
(
  'modelo-comparecimento', 'declaracao', 'Declaração de Comparecimento', 'Declaração de Comparecimento',
  E'Declaro, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, esteve sob tratamento odontológico neste consultório no período das ____ às ____ horas do dia {{data}}, sendo recomendado o retorno às suas atividades.',
  'elegante', 3
)
on conflict (id) do nothing;

do $$
begin
  execute 'alter table document_templates enable row level security';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table document_templates from anon, authenticated';
  end if;
end $$;
