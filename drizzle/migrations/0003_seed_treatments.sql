-- Starter catalog of treatments/procedures offered by the clinic, matching the
-- categories already advertised on the public /servicos page (limpeza,
-- clareamento, implantes, ortodontia, odontopediatria, urgência) plus the
-- individual procedures behind them.
insert into public.treatments (name, description, price, duration_minutes, active) values
  ('Avaliação Odontológica', 'Consulta inicial para diagnóstico e plano de tratamento.', 0, 30, true),
  ('Limpeza e Profilaxia', 'Remoção de tártaro e placa bacteriana para prevenção.', 80, 40, true),
  ('Clareamento Dental', 'Clareamento a laser com resultados já na primeira sessão.', 350, 60, true),
  ('Restauração (Obturação)', 'Reparo de cáries com resina na cor do dente.', 120, 45, true),
  ('Extração Simples', 'Remoção de dente sem complicações.', 100, 30, true),
  ('Extração de Siso', 'Remoção cirúrgica do terceiro molar.', 280, 60, true),
  ('Tratamento de Canal', 'Tratamento endodôntico para salvar o dente.', 450, 90, true),
  ('Implante Dentário', 'Implante de titânio com planejamento 3D.', 1800, 90, true),
  ('Coroa Dentária', 'Coroa protética sobre dente ou implante.', 700, 60, true),
  ('Prótese Dentária', 'Prótese parcial ou total removível.', 600, 60, true),
  ('Aparelho Ortodôntico (Instalação)', 'Instalação de aparelho fixo metálico.', 800, 60, true),
  ('Manutenção de Aparelho', 'Ajuste mensal do aparelho ortodôntico.', 80, 20, true),
  ('Odontopediatria', 'Atendimento infantil com abordagem lúdica.', 90, 40, true),
  ('Aplicação de Flúor', 'Reforço do esmalte dentário, indicado para crianças.', 60, 20, true),
  ('Radiografia Panorâmica', 'Exame de imagem completo da arcada dentária.', 90, 15, true),
  ('Urgência Odontológica 24h', 'Atendimento emergencial para dor ou trauma.', 150, 45, true);
