-- Modelos de documentos: as linhas "____" dos modelos padrão viram campos
-- para preencher ({{campo:...}}), que aparecem como formulário ao gerar o
-- documento. Só altera modelos que ainda estão com o texto original.

update document_templates set body = E'Paciente: {{paciente_nome}}\n\nUso oral\n\n1. {{campo:Medicamento 1}}\n   {{campo:Como usar 1}}\n\n2. {{campo:Medicamento 2}}\n   {{campo:Como usar 2}}\n\n3. {{campo:Medicamento 3}}\n   {{campo:Como usar 3}}'
where id = 'modelo-receituario'
  and body = E'Paciente: {{paciente_nome}}\n\nUso oral\n\n1. ______________________________________________\n   ______________________________________________\n\n2. ______________________________________________\n   ______________________________________________\n\n3. ______________________________________________\n   ______________________________________________';

update document_templates set body = E'Atesto, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, residente à {{paciente_endereco}}, esteve sob meus cuidados profissionais no período das {{campo:Hora de início}} às {{campo:Hora de término}} horas do dia {{data}}, necessitando o(a) mesmo(a) de {{campo:Dias de repouso}} dia(s) de convalescença.\n\nCID: {{campo:CID}}'
where id = 'modelo-atestado'
  and body = E'Atesto, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, residente à {{paciente_endereco}}, esteve sob meus cuidados profissionais no período das ____ às ____ horas do dia {{data}}, necessitando o(a) mesmo(a) de ____ dia(s) de convalescença.\n\nCID: __________';

update document_templates set body = E'Declaro, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, esteve sob tratamento odontológico neste consultório no período das {{campo:Hora de início}} às {{campo:Hora de término}} horas do dia {{data}}, sendo recomendado o retorno às suas atividades.'
where id = 'modelo-comparecimento'
  and body = E'Declaro, para os devidos fins, que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, esteve sob tratamento odontológico neste consultório no período das ____ às ____ horas do dia {{data}}, sendo recomendado o retorno às suas atividades.';
