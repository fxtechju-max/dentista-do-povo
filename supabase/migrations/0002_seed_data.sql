-- Seed data (PostgreSQL / Supabase): treatment catalog, blog posts (both
-- batches, with categories folded in) and public site services. Converted
-- mechanically from the original PostgreSQL seed migrations
-- (drizzle/migrations/0003, 0005, 0008) — same content, PostgreSQL syntax.

-- Starter catalog of treatments/procedures offered by the clinic, matching the
-- categories already advertised on the public /servicos page (limpeza,
-- clareamento, implantes, ortodontia, odontopediatria, urgência) plus the
-- individual procedures behind them.
insert into treatments (name, description, price, duration_minutes, active) values
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

-- Starter content for the public blog, written for the clinic (not copied
-- from any external source). Cover photos are free-to-use stock photos from
-- Pexels (Pexels License: free for commercial and personal use, no
-- attribution required) — https://www.pexels.com/license/
insert into blog_posts (title, slug, excerpt, content, cover_image_url, category, status, published_at) values

('Como escovar os dentes corretamente', 'como-escovar-os-dentes-corretamente',
'A escovação é a base da saúde bucal, mas pequenos erros no dia a dia reduzem sua eficiência. Veja o passo a passo certo.',
'Escovar os dentes parece simples, mas a técnica faz toda a diferença na hora de remover a placa bacteriana. O recomendado é usar movimentos curtos e suaves, em ângulo de 45 graus em relação à gengiva, cobrindo todas as faces dos dentes: externa, interna e a superfície de mastigação.

O tempo também importa. Uma escovação completa leva, em média, dois minutos. Escovar rápido demais costuma deixar regiões próximas à gengiva e entre os dentes sem limpeza adequada, favorecendo o acúmulo de tártaro ao longo do tempo.

Prefira escovas com cerdas macias e troque o item a cada três meses, ou antes se as cerdas começarem a abrir. Escovar os dentes pelo menos duas vezes ao dia, sempre após as refeições principais, é o hábito mais simples para manter o sorriso saudável. Na dúvida sobre a técnica ideal para o seu caso, pergunte ao seu dentista na próxima consulta.',
'https://images.pexels.com/photos/9475393/pexels-photo-9475393.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '2 days'),

('Fio dental: por que é indispensável', 'fio-dental-por-que-e-indispensavel',
'A escova não alcança tudo. Entenda por que o fio dental é a etapa que mais gente pula e por que ela é essencial.',
'A escova de dentes limpa bem as superfícies externa e interna, mas não consegue alcançar os espaços entre os dentes, onde restos de alimento e placa bacteriana se acumulam. É exatamente ali que boa parte das cáries e inflamações na gengiva começam.

Usar o fio dental uma vez por dia, de preferência à noite, remove esses resíduos antes que eles se transformem em tártaro. A técnica correta envolve deslizar o fio suavemente, formando uma curva em torno de cada dente, sem forçar contra a gengiva.

Quem tem dificuldade com o fio tradicional pode optar por fio dental com haste, escovas interdentais ou irrigadores bucais — o importante é limpar entre os dentes todos os dias. Esse pequeno hábito extra faz uma diferença enorme na saúde da gengiva a longo prazo.',
'https://images.pexels.com/photos/8191884/pexels-photo-8191884.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '5 days'),

('Clareamento dental: mitos e verdades', 'clareamento-dental-mitos-e-verdades',
'Ele estraga o esmalte? Dura para sempre? Separamos o que é fato e o que é mito sobre o clareamento dental.',
'O clareamento dental é um dos procedimentos estéticos mais procurados nos consultórios, mas também um dos que mais gera dúvidas. Um mito comum é que ele enfraquece o esmalte dos dentes — quando feito por um profissional, com produtos e concentrações adequadas, o procedimento é seguro e não danifica a estrutura dentária.

Outro ponto importante: o clareamento não é definitivo. O efeito costuma durar de um a dois anos, dependendo dos hábitos alimentares e de higiene de cada pessoa. Café, vinho tinto e cigarro aceleram o retorno da coloração original.

Também vale lembrar que nem todo escurecimento responde ao clareamento convencional — manchas causadas por antibióticos ou traumas, por exemplo, podem exigir outras abordagens, como facetas. Por isso, uma avaliação prévia com o dentista é sempre o primeiro passo antes de iniciar qualquer tratamento.',
'https://images.pexels.com/photos/12474261/pexels-photo-12474261.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '8 days'),

('Sinais de que você precisa ir ao dentista', 'sinais-de-que-voce-precisa-ir-ao-dentista',
'Sangramento na gengiva, sensibilidade e mau hálito persistente não são normais. Conheça os sinais que pedem uma consulta.',
'É comum adiar a ida ao dentista até sentir dor, mas vários sinais aparecem bem antes disso e merecem atenção. Sangramento ao escovar os dentes, gengiva inchada ou vermelha, e mau hálito que não melhora mesmo com boa higiene são indícios de inflamação que só um profissional consegue tratar na origem.

Sensibilidade a alimentos quentes, frios ou doces também não deve ser ignorada, assim como manchas escuras ou brancas na superfície dos dentes. Esses sinais podem indicar desde o início de uma cárie até desgaste do esmalte.

A recomendação geral é visitar o dentista a cada seis meses, mesmo sem sintomas, para exames de rotina e limpeza profissional. Quanto mais cedo um problema é identificado, mais simples e barato costuma ser o tratamento.',
'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '11 days'),

('Cuidados com a saúde bucal infantil', 'cuidados-com-a-saude-bucal-infantil',
'Os hábitos criados na infância definem a saúde bucal na vida adulta. Veja como cuidar dos dentes de bebês e crianças.',
'A higiene bucal começa antes mesmo do primeiro dente nascer: limpar a gengiva do bebê com uma gaze úmida após a amamentação já ajuda a remover bactérias. Assim que os primeiros dentes de leite aparecem, é hora de introduzir uma escova macia e apropriada para a idade.

Muitos pais acreditam que os dentes de leite não precisam de tanto cuidado, já que vão cair. Na prática, cáries nos dentes de leite podem causar dor, infecção e até afetar o desenvolvimento dos dentes permanentes que estão se formando embaixo deles.

A primeira consulta odontológica é recomendada por volta do primeiro aniversário. Criar uma rotina leve e positiva, com escovação supervisionada e visitas regulares ao dentista, ajuda a criança a associar o cuidado bucal a algo natural, sem medo.',
'https://images.pexels.com/photos/8224633/pexels-photo-8224633.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Fases da Vida', 'publicado', now() - interval '14 days'),

('Alimentos que prejudicam os dentes', 'alimentos-que-prejudicam-os-dentes',
'Não é só doce que faz mal. Conheça os alimentos e hábitos alimentares que mais desgastam o esmalte dos dentes.',
'Açúcar é o vilão mais conhecido, mas está longe de ser o único. Balas grudentas e caramelos ficam presos entre os dentes por horas, prolongando o contato do açúcar com o esmalte e facilitando a formação de cáries.

Alimentos e bebidas ácidos, como refrigerantes, sucos cítricos e vinagre, também merecem atenção: o ácido amolece temporariamente o esmalte, tornando-o mais vulnerável a desgaste. Gelo, pipoca com casca dura e outros alimentos duros podem causar pequenas fraturas nos dentes quando mastigados com força.

A dica não é eliminar todos esses alimentos, mas consumi-los com moderação e, sempre que possível, seguidos de um copo de água ou escovação. Esperar cerca de 30 minutos após consumir algo ácido antes de escovar os dentes evita esfregar o esmalte enquanto ele ainda está amolecido.',
'https://images.pexels.com/photos/7843008/pexels-photo-7843008.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '17 days'),

('Alimentos que fortalecem os dentes', 'alimentos-que-fortalecem-os-dentes',
'Cálcio, fósforo e fibras são aliados da saúde bucal. Veja quais alimentos ajudam a manter os dentes fortes.',
'Assim como existem alimentos que prejudicam os dentes, também há aqueles que ajudam a fortalecê-los. Leite, queijo e iogurte são ricos em cálcio e fósforo, minerais essenciais para manter o esmalte forte e auxiliar na remineralização natural dos dentes.

Vegetais crocantes, como cenoura e pepino, e frutas como maçã, estimulam a produção de saliva durante a mastigação. A saliva funciona como uma defesa natural da boca, ajudando a neutralizar ácidos e a limpar resíduos de alimentos.

Alimentos ricos em fibras, castanhas e água em abundância completam uma dieta que favorece a saúde bucal. Combinar uma boa alimentação com escovação regular e visitas ao dentista é a fórmula mais simples para manter o sorriso saudável por mais tempo.',
'https://images.pexels.com/photos/4198015/pexels-photo-4198015.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '20 days'),

('Bruxismo: causas, sintomas e tratamento', 'bruxismo-causas-sintomas-e-tratamento',
'Ranger ou apertar os dentes durante o sono pode causar dor de cabeça, desgaste dentário e problemas na mandíbula.',
'Bruxismo é o hábito de ranger ou apertar os dentes de forma involuntária, geralmente durante o sono. Estresse, ansiedade e alterações no sono estão entre as causas mais comuns, embora fatores como má oclusão dentária também possam contribuir.

Os sinais costumam aparecer aos poucos: dor de cabeça ao acordar, sensibilidade nos dentes, desgaste visível no esmalte e até dor ou estalos na articulação da mandíbula. Muitas pessoas só descobrem que rangem os dentes porque um parceiro de quarto percebe o barulho durante a noite.

O tratamento mais comum é o uso de uma placa de mordida feita sob medida, que protege os dentes do desgaste e alivia a tensão muscular. Em alguns casos, trabalhar o estresse com apoio profissional também faz parte do tratamento. Se você desconfia que tem bruxismo, vale conversar com o dentista para uma avaliação completa.',
'https://images.pexels.com/photos/935777/pexels-photo-935777.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '23 days'),

('Implante dentário: tudo que você precisa saber', 'implante-dentario-tudo-que-voce-precisa-saber',
'O implante é hoje a solução mais duradoura para repor um dente perdido. Entenda como funciona o processo.',
'O implante dentário é um parafuso de titânio inserido no osso da mandíbula ou maxila, que substitui a raiz de um dente perdido. Com o tempo, o titânio se integra ao osso em um processo chamado osseointegração, criando uma base firme para receber uma coroa protética.

O procedimento costuma ser feito em etapas: primeiro a instalação do implante, depois um período de cicatrização que pode levar de dois a seis meses, e por fim a colocação da coroa. Avanços no planejamento 3D tornaram o processo mais previsível e confortável do que era há alguns anos.

Comparado a outras soluções, como pontes ou próteses removíveis, o implante tem a vantagem de preservar o osso da região e não depender dos dentes vizinhos. Nem todo mundo é candidato imediato ao procedimento — quantidade de osso disponível e saúde geral são avaliados antes do planejamento.',
'https://images.pexels.com/photos/4687905/pexels-photo-4687905.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '26 days'),

('Aparelho ortodôntico: tipos e como escolher', 'aparelho-ortodontico-tipos-e-como-escolher',
'Metálico, estético ou alinhador invisível? Conheça as opções de aparelho ortodôntico disponíveis hoje.',
'O aparelho ortodôntico continua sendo a forma mais eficaz de corrigir o alinhamento dos dentes e problemas de mordida. O modelo metálico fixo, mais tradicional, é também o mais versátil, indicado para praticamente qualquer tipo de correção, incluindo casos mais complexos.

Para quem busca discrição, existem os aparelhos estéticos, com braquetes de cerâmica na cor do dente, e os alinhadores transparentes removíveis, populares entre adultos. Os alinhadores costumam funcionar bem em casos leves a moderados, mas nem todo caso é indicado para essa técnica.

A escolha ideal depende de uma avaliação ortodôntica completa, que leva em conta o tipo de desalinhamento, a idade do paciente e até o estilo de vida. O acompanhamento regular durante o tratamento, com ajustes periódicos, é o que garante o resultado esperado ao final do processo.',
'https://images.pexels.com/photos/9592952/pexels-photo-9592952.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '29 days'),

('Gengivite e periodontite: como prevenir', 'gengivite-e-periodontite-como-prevenir',
'Gengiva que sangra não é normal. Entenda a diferença entre gengivite e periodontite e como evitar as duas.',
'A gengivite é a inflamação da gengiva causada pelo acúmulo de placa bacteriana perto da linha da gengiva. Ela costuma se manifestar como vermelhidão, inchaço e sangramento durante a escovação — e, na maioria dos casos, é reversível com uma boa higiene bucal e limpeza profissional.

Quando não tratada, a gengivite pode evoluir para periodontite, uma condição mais séria que atinge as estruturas de sustentação do dente, incluindo o osso. Nesse estágio, os danos já não são totalmente reversíveis e podem levar à perda dos dentes se não forem controlados.

A boa notícia é que ambas são altamente evitáveis: escovação correta, uso diário do fio dental e limpezas profissionais regulares removem a placa antes que ela cause danos maiores. Fumar e diabetes descontrolada são fatores que aumentam bastante o risco de doença periodontal.',
'https://images.pexels.com/photos/5462612/pexels-photo-5462612.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '32 days'),

('Halitose (mau hálito): causas e soluções', 'halitose-mau-halito-causas-e-solucoes',
'O mau hálito quase sempre tem uma causa tratável. Veja de onde ele vem e o que realmente resolve o problema.',
'Na grande maioria dos casos, o mau hálito tem origem na própria boca: restos de alimento na língua e entre os dentes são decompostos por bactérias, liberando compostos com cheiro forte. Por isso, limpar a língua diariamente é tão importante quanto escovar os dentes.

Bocas secas também favorecem o mau hálito, já que a saliva ajuda a limpar naturalmente a cavidade oral. Isso explica por que muita gente acorda com o hálito mais forte, já que a produção de saliva diminui durante o sono.

Quando o mau hálito persiste mesmo com boa higiene, vale investigar outras causas, como problemas na gengiva, sinusite ou questões digestivas. Enxaguantes bucais mascaram o cheiro por pouco tempo, mas não substituem o tratamento da causa real — por isso, um mau hálito persistente merece uma avaliação com o dentista.',
'https://images.pexels.com/photos/5009111/pexels-photo-5009111.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '35 days'),

('Sensibilidade dentária: por que acontece', 'sensibilidade-dentaria-por-que-acontece',
'Aquela pontada ao tomar algo gelado tem explicação. Entenda as causas da sensibilidade dentária e como aliviá-la.',
'A sensibilidade dentária acontece quando a dentina, camada logo abaixo do esmalte, fica exposta e permite que estímulos como frio, calor ou doce cheguem até os nervos do dente. Isso pode acontecer por desgaste do esmalte, retração da gengiva ou escovação feita com força excessiva.

Escovar os dentes com uma escova de cerdas duras, por muito tempo e com muita pressão, é uma das causas mais comuns e mais fáceis de corrigir. Bebidas ácidas e o bruxismo também contribuem para o desgaste do esmalte ao longo dos anos.

Cremes dentais específicos para sensibilidade ajudam a aliviar o desconforto no dia a dia, mas não resolvem a causa. Um dentista pode identificar a origem exata do problema e indicar tratamentos como aplicação de flúor, selantes ou ajuste da técnica de escovação.',
'https://images.pexels.com/photos/2244332/pexels-photo-2244332.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '38 days'),

('Tratamento de canal: mitos e verdades', 'tratamento-de-canal-mitos-e-verdades',
'Fama de doloroso, o canal é hoje um procedimento tranquilo. Separamos o que é mito e o que é verdade sobre o tratamento.',
'Poucos procedimentos odontológicos carregam tanta fama negativa quanto o tratamento de canal. A verdade é que, com anestesia local e as técnicas atuais, o procedimento costuma ser tão tranquilo quanto uma restauração comum — a dor associada ao canal geralmente vem da infecção que já existia antes do tratamento, não do procedimento em si.

O canal é indicado quando a infecção ou inflamação atinge a polpa do dente, a parte interna onde ficam os vasos sanguíneos e nervos. O tratamento remove o tecido comprometido, limpa e veda os canais internos da raiz, preservando o dente que, de outra forma, precisaria ser extraído.

Após o tratamento, é comum sentir um leve desconforto por alguns dias, controlado com analgésicos simples. Na maioria dos casos, o dente recebe uma coroa de proteção depois do canal, já que ele fica mais frágil sem a polpa viva em seu interior.',
'https://images.pexels.com/photos/3845729/pexels-photo-3845729.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '41 days'),

('Saúde bucal na gravidez', 'saude-bucal-na-gravidez',
'As mudanças hormonais da gravidez afetam também a saúde bucal. Veja os cuidados recomendados em cada fase.',
'As alterações hormonais da gravidez aumentam o fluxo sanguíneo na gengiva, deixando-a mais sensível e propensa a sangramento e inflamação — condição conhecida como gengivite gestacional. Manter uma rotina rigorosa de escovação e uso de fio dental ajuda a controlar esse efeito.

Enjoos matinais frequentes também expõem os dentes ao ácido do estômago repetidas vezes. Nesses casos, é melhor enxaguar a boca com água em vez de escovar imediatamente após o episódio, já que o esmalte fica temporariamente mais frágil.

Consultas de rotina ao dentista são seguras durante toda a gestação, e procedimentos essenciais podem ser realizados com os devidos cuidados, especialmente no segundo trimestre. Avisar o dentista sobre a gravidez ajuda a adaptar qualquer tratamento às necessidades desse momento.',
'https://images.pexels.com/photos/7089047/pexels-photo-7089047.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Fases da Vida', 'publicado', now() - interval '44 days'),

('Cuidados bucais para idosos', 'cuidados-bucais-para-idosos',
'Boca seca, próteses e dentes mais sensíveis pedem atenção redobrada. Veja os cuidados bucais essenciais na terceira idade.',
'Com o passar dos anos, é comum a produção de saliva diminuir, muitas vezes como efeito colateral de medicamentos de uso contínuo. A boca seca aumenta o risco de cáries e infecções, por isso beber água regularmente e usar produtos específicos para hidratação bucal pode ajudar bastante.

Quem usa prótese dentária precisa de cuidados específicos: a limpeza diária da prótese, feita com escova própria e fora da boca, evita o acúmulo de fungos e bactérias. Mesmo sem dentes naturais, a gengiva e o céu da boca continuam precisando de higiene.

Doenças como diabetes e osteoporose, mais comuns na terceira idade, também têm relação direta com a saúde bucal. Manter consultas regulares ao dentista ajuda a identificar cedo qualquer alteração e a ajustar próteses ou tratamentos conforme a necessidade muda com o tempo.',
'https://images.pexels.com/photos/1961183/pexels-photo-1961183.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Fases da Vida', 'publicado', now() - interval '47 days'),

('Extração do dente do siso: quando é necessária', 'extracao-do-dente-do-siso-quando-e-necessaria',
'Nem todo siso precisa ser extraído. Entenda quando a remoção é recomendada e como é o procedimento.',
'O dente do siso, ou terceiro molar, costuma nascer entre os 17 e 25 anos — e nem sempre há espaço suficiente na arcada dentária para ele se posicionar corretamente. Quando o siso nasce torto, parcialmente coberto pela gengiva ou pressiona os dentes vizinhos, a extração costuma ser recomendada para evitar dor, infecções e problemas de alinhamento.

Por outro lado, quando o siso nasce alinhado, totalmente irrompido e de fácil higienização, ele pode ser mantido sem problemas. A decisão de extrair ou não depende de uma avaliação clínica e de exames de imagem, que mostram a posição exata do dente e sua relação com estruturas vizinhas.

A extração é feita com anestesia local e, dependendo da complexidade, pode levar de alguns minutos a cerca de uma hora. É normal sentir inchaço e desconforto leve nos dias seguintes, controlados com repouso, compressas frias e a medicação indicada pelo dentista.',
'https://images.pexels.com/photos/12745979/pexels-photo-12745979.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '50 days'),

('Prótese dentária: tipos e cuidados', 'protese-dentaria-tipos-e-cuidados',
'Fixa, removível ou sobre implante: cada tipo de prótese dentária tem indicações e cuidados diferentes.',
'A prótese dentária substitui um ou mais dentes perdidos, devolvendo função de mastigação, fala e estética. As próteses fixas são cimentadas sobre dentes preparados ou implantes e não são removidas pelo paciente, enquanto as próteses removíveis, parciais ou totais, podem ser retiradas para higienização.

Cada tipo exige cuidados específicos. Próteses fixas são higienizadas como dentes naturais, com escova e fio dental adaptado. Já as removíveis precisam ser escovadas fora da boca após as refeições e guardadas em um recipiente com água ou solução própria durante a noite, para não ressecar o material.

Próteses mal ajustadas podem causar feridas, dificuldade para mastigar e até acelerar a perda óssea na região. Por isso, é importante retornar ao dentista se a prótese começar a ficar frouxa ou incomodar — pequenos ajustes evitam problemas maiores no futuro.',
'https://images.pexels.com/photos/6529216/pexels-photo-6529216.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Tratamentos', 'publicado', now() - interval '53 days'),

('Como escolher a escova de dente ideal', 'como-escolher-a-escova-de-dente-ideal',
'Cerdas macias ou duras? Manual ou elétrica? Veja como escolher a escova certa para a sua boca.',
'Com tantas opções nas prateleiras, escolher uma escova de dente pode parecer mais complicado do que deveria. A recomendação da maioria dos dentistas é simples: cerdas macias, que limpam bem sem agredir o esmalte ou machucar a gengiva, e cabeça pequena o suficiente para alcançar todos os cantos da boca.

Escovas elétricas não são obrigatórias para uma boa higiene, mas podem ajudar quem tem dificuldade de coordenação ou tende a escovar com muita força, já que muitos modelos avisam quando a pressão está excessiva. O resultado final depende mais da técnica e da constância do que do tipo de escova usada.

Independentemente do modelo escolhido, o ideal é trocar a escova a cada três meses, ou antes se as cerdas começarem a se abrir. Escovas gastas perdem eficiência e podem acumular bactérias, reduzindo a qualidade da limpeza no dia a dia.',
'https://images.pexels.com/photos/5478207/pexels-photo-5478207.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '56 days'),

('Visitas regulares ao dentista: qual a frequência ideal', 'visitas-regulares-ao-dentista-qual-a-frequencia-ideal',
'Esperar sentir dor para ir ao dentista custa mais caro, literalmente. Entenda por que a prevenção é o melhor caminho.',
'A recomendação mais conhecida é visitar o dentista a cada seis meses, mesmo sem sintomas. Nessas consultas de rotina, o profissional consegue identificar cáries no início, avaliar a saúde da gengiva e fazer a limpeza profissional, removendo o tártaro que a escovação sozinha não elimina.

Algumas pessoas precisam de acompanhamento mais frequente, como quem tem histórico de doença periodontal, diabetes ou está em tratamento ortodôntico. Já pacientes com boa saúde bucal e baixo risco de cáries podem, em alguns casos, espaçar um pouco mais as consultas, sempre com orientação do próprio dentista.

Tratar um problema no início costuma ser mais simples, rápido e barato do que esperar ele evoluir. Encarar a consulta odontológica como prevenção, e não apenas como solução para dor, é o que realmente protege o sorriso a longo prazo.',
'https://images.pexels.com/photos/30902075/pexels-photo-30902075.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Prevenção', 'publicado', now() - interval '59 days');

-- Second batch: posts about dentistry as a profession, dental specialties and
-- what to expect from a dentist — written for the clinic (not copied from any
-- external source). Cover photos are free-to-use stock photos from Pexels
-- (Pexels License: free for commercial and personal use, no attribution
-- required) — https://www.pexels.com/license/
insert into blog_posts (title, slug, excerpt, content, cover_image_url, category, status, published_at) values

('O que faz um cirurgião-dentista', 'o-que-faz-um-cirurgiao-dentista',
'Muito além de tratar dor de dente. Entenda a real dimensão do trabalho de um cirurgião-dentista.',
'O cirurgião-dentista é o profissional responsável por prevenir, diagnosticar e tratar doenças da boca, dos dentes, da gengiva e das estruturas relacionadas, como a articulação da mandíbula. O trabalho vai muito além de tratar dor: envolve prevenção, diagnóstico por imagem, procedimentos cirúrgicos e acompanhamento de longo prazo.

No dia a dia, o dentista avalia radiografias, planeja tratamentos que podem levar meses, orienta pacientes sobre hábitos de higiene e, cada vez mais, atua em conjunto com outros profissionais de saúde — já que problemas bucais têm relação direta com condições como diabetes e doenças cardiovasculares.

No Brasil, para exercer a profissão é obrigatório ter graduação em Odontologia reconhecida pelo MEC e registro ativo no Conselho Regional de Odontologia (CRO) do estado onde atua. Esse registro pode ser consultado publicamente no site do Conselho Federal de Odontologia, o que é uma forma simples de verificar a regularidade de qualquer profissional.',
'https://images.pexels.com/photos/4971555/pexels-photo-4971555.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '62 days'),

('Especialidades da odontologia: qual procurar para cada caso', 'especialidades-da-odontologia-qual-procurar',
'Ortodontista, endodontista, periodontista... Entenda as principais especialidades e quando procurar cada uma.',
'A odontologia é dividida em diversas especialidades reconhecidas pelo Conselho Federal de Odontologia, cada uma focada em um aspecto da saúde bucal. O cirurgião-dentista generalista, responsável pelo atendimento de rotina, é geralmente o primeiro contato e quem encaminha o paciente a um especialista quando necessário.

Entre as especialidades mais procuradas estão a ortodontia (alinhamento dos dentes), a endodontia (tratamento de canal), a periodontia (gengiva e estruturas de suporte), a implantodontia (implantes), a odontopediatria (crianças) e a cirurgia bucomaxilofacial (procedimentos cirúrgicos mais complexos).

Na prática, não é preciso saber exatamente qual especialista procurar antes de qualquer consulta — o dentista generalista faz essa triagem. Mas entender as especialidades ajuda a compreender por que, em alguns casos, um tratamento é dividido entre mais de um profissional.',
'https://images.pexels.com/photos/6528858/pexels-photo-6528858.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '65 days'),

('Como escolher um bom dentista', 'como-escolher-um-bom-dentista',
'CRO ativo, comunicação clara e ambiente limpo. Veja o que observar na hora de escolher um dentista de confiança.',
'Escolher um dentista é uma decisão que vale a pena levar a sério, já que o acompanhamento odontológico costuma ser de longo prazo. O primeiro ponto a verificar é o registro no Conselho Regional de Odontologia (CRO), que pode ser consultado gratuitamente no site do Conselho Federal de Odontologia — qualquer profissional regularizado terá esse número.

Além da formalização, vale observar como o profissional se comunica: um bom dentista explica o diagnóstico, apresenta opções de tratamento com seus custos e riscos, e responde dúvidas sem pressa. Ambiente limpo, uso visível de itens de biossegurança (luvas, máscaras, esterilização de instrumentos) também são sinais importantes.

Indicações de outros pacientes ajudam, mas a experiência é individual — o que funciona para uma pessoa pode não funcionar para outra. Marcar uma consulta inicial de avaliação, sem compromisso com um tratamento longo, é uma boa forma de conhecer o profissional antes de decidir.',
'https://images.pexels.com/photos/5206923/pexels-photo-5206923.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '68 days'),

('O que verificar antes de marcar uma consulta odontológica', 'o-que-verificar-antes-de-marcar-consulta',
'Alguns cuidados simples ajudam a garantir que você está em boas mãos antes mesmo de sentar na cadeira.',
'Antes de marcar uma consulta, vale conferir se a clínica ou o profissional divulga o número de registro no CRO — informação que costuma aparecer em sites, redes sociais ou pode ser pedida diretamente por telefone. Esse dado também pode ser confirmado na consulta pública do Conselho Federal de Odontologia.

Outro ponto é entender, ainda que de forma geral, o motivo da consulta e se a clínica atende a essa necessidade específica: nem toda clínica realiza todos os procedimentos, e algumas encaminham casos mais complexos a especialistas parceiros.

Por fim, é razoável perguntar sobre valores aproximados e formas de pagamento antes da consulta, especialmente para tratamentos mais longos. Transparência nesse ponto, desde o primeiro contato, costuma ser um bom indicador de como será toda a relação com o paciente.',
'https://images.pexels.com/photos/6627668/pexels-photo-6627668.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '71 days'),

('Primeira consulta no dentista: o que esperar', 'primeira-consulta-no-dentista-o-que-esperar',
'Anamnese, exame clínico e plano de tratamento. Entenda o passo a passo de uma primeira consulta odontológica.',
'A primeira consulta com um novo dentista geralmente começa com a anamnese: um conjunto de perguntas sobre histórico de saúde, medicamentos em uso, alergias e hábitos, como fumo e bruxismo. Essa etapa é importante porque vários problemas bucais têm relação com a saúde geral do paciente.

Em seguida, o dentista faz um exame clínico completo da boca, observando dentes, gengiva, língua e articulação da mandíbula, muitas vezes complementado por radiografias. Esse levantamento inicial serve de base para identificar problemas existentes e also para comparação em consultas futuras.

Ao final, o profissional costuma apresentar um panorama da situação bucal e, se necessário, um plano de tratamento com as etapas sugeridas, prioridades e valores envolvidos. Nem tudo precisa ser resolvido na primeira visita — muitas vezes o plano é executado ao longo de várias consultas.',
'https://images.pexels.com/photos/5622033/pexels-photo-5622033.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '74 days'),

('Anestesia odontológica: como funciona e é segura', 'anestesia-odontologica-como-funciona',
'Medo de anestesia é comum, mas entender como ela funciona ajuda a desmistificar o procedimento.',
'A anestesia local é uma das ferramentas mais importantes da odontologia moderna, permitindo que procedimentos que antes seriam dolorosos sejam feitos com conforto. Ela age bloqueando temporariamente a transmissão de impulsos nervosos na região tratada, sem afetar a consciência do paciente.

A aplicação costuma causar um desconforto rápido, muitas vezes minimizado com anestésico tópico aplicado antes da agulha e técnicas de injeção lenta. O efeito começa em poucos minutos e dura o tempo suficiente para a maioria dos procedimentos, dissipando-se gradualmente depois.

Reações alérgicas a anestésicos odontológicos modernos são raras, mas é fundamental informar ao dentista sobre alergias conhecidas, condições cardíacas ou uso de medicamentos antes de qualquer procedimento. Essa conversa faz parte da rotina de segurança de qualquer atendimento bem feito.',
'https://images.pexels.com/photos/8413088/pexels-photo-8413088.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '77 days'),

('Biossegurança no consultório odontológico', 'biosseguranca-no-consultorio-odontologico',
'Esterilização, barreiras de proteção e descarte correto: veja o que garante um atendimento seguro.',
'Biossegurança é o conjunto de práticas que evita a contaminação cruzada entre pacientes e profissionais em um consultório odontológico. Isso inclui a esterilização de instrumentos em autoclave, uso de barreiras descartáveis (luvas, máscaras, campos) e desinfecção de superfícies entre um atendimento e outro.

Instrumentos que entram em contato com sangue ou saliva, como brocas e pontas de ultrassom, precisam passar por um ciclo completo de limpeza e esterilização antes de serem reutilizados. Itens descartáveis, como agulhas e sugadores, nunca devem ser reaproveitados entre pacientes.

Como paciente, é possível observar sinais simples de boas práticas: profissionais trocando luvas entre atendimentos, embalagens de instrumentos esterilizados sendo abertas na sua frente, e um ambiente visivelmente organizado e limpo. Não há problema em perguntar sobre os protocolos de biossegurança de uma clínica.',
'https://images.pexels.com/photos/305566/pexels-photo-305566.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '80 days'),

('Odontologia digital: como a tecnologia mudou os consultórios', 'odontologia-digital-como-a-tecnologia-mudou',
'Radiografias digitais, planejamento 3D e scanners intraorais: a tecnologia tornou a odontologia mais precisa.',
'Nos últimos anos, a odontologia passou por uma transformação digital significativa. Radiografias tradicionais em filme deram lugar a sensores digitais, que produzem imagens instantâneas com menor exposição à radiação e permitem ajustes de contraste para melhor visualização de detalhes.

O planejamento de tratamentos como implantes também mudou: tomografias 3D permitem simular o posicionamento exato de um implante antes mesmo do procedimento, aumentando a previsibilidade e reduzindo riscos. Scanners intraorais substituem moldes de silicone por leituras digitais da boca, mais rápidas e confortáveis para o paciente.

Essas tecnologias não substituem o julgamento clínico do dentista, mas funcionam como ferramentas que aumentam a precisão do diagnóstico e do planejamento. Perguntar quais recursos uma clínica utiliza pode ajudar a entender o nível de investimento em tecnologia do consultório.',
'https://images.pexels.com/photos/4269505/pexels-photo-4269505.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '83 days'),

('Ortodontista x dentista geral: quando procurar cada um', 'ortodontista-x-dentista-geral-quando-procurar',
'Nem todo caso de dentes desalinhados precisa de um especialista. Entenda a diferença entre os dois profissionais.',
'O dentista generalista atende a maior parte das necessidades odontológicas do dia a dia: limpezas, restaurações, avaliações de rotina e pequenos ajustes. Ele também é o profissional que, ao identificar um problema de alinhamento dentário ou de mordida, faz o encaminhamento para um ortodontista.

O ortodontista é o especialista dedicado a diagnosticar e tratar problemas de posicionamento dos dentes e da mandíbula, usando aparelhos fixos, removíveis ou alinhadores. Ele acompanha o tratamento por meses ou anos, com ajustes periódicos até atingir o resultado planejado.

Em muitos casos, os dois profissionais trabalham em conjunto: o dentista generalista cuida da saúde bucal geral enquanto o ortodontista conduz o tratamento de alinhamento, e ambos se comunicam sobre o andamento do caso. Essa parceria é comum e beneficia diretamente o paciente.',
'https://images.pexels.com/photos/3845985/pexels-photo-3845985.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '86 days'),

('Endodontista: o especialista em tratamento de canal', 'endodontista-o-especialista-em-canal',
'Quando o tratamento de canal é mais complexo, um endodontista pode ser o profissional mais indicado.',
'A endodontia é a especialidade da odontologia dedicada ao estudo e tratamento da polpa dentária — o tecido interno do dente que contém vasos sanguíneos e nervos. O endodontista é o especialista que trata infecções e inflamações nesse tecido, principalmente por meio do tratamento de canal.

Embora muitos dentistas generalistas realizem tratamentos de canal em casos mais simples, situações mais complexas — como canais com anatomia atípica, retratamentos ou dentes com múltiplas raízes curvas — costumam ser encaminhadas a um endodontista, que trabalha com equipamentos e técnicas específicas para esses casos.

O uso de microscópio operatório, por exemplo, é comum em consultórios de endodontia, permitindo uma visualização ampliada dos canais radiculares. Isso aumenta a precisão do tratamento e as chances de sucesso em casos que exigem mais cuidado técnico.',
'https://images.pexels.com/photos/3946833/pexels-photo-3946833.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '89 days'),

('Periodontista: o especialista em gengiva e osso', 'periodontista-o-especialista-em-gengiva-e-osso',
'Gengivas inflamadas ou retraídas podem exigir um periodontista. Entenda o papel desse especialista.',
'A periodontia estuda as estruturas que sustentam os dentes: gengiva, ligamento periodontal e osso. O periodontista é o especialista que trata doenças como gengivite e periodontite, além de realizar procedimentos como enxertos gengivais e cirurgias para tratar retração da gengiva.

Casos leves de inflamação gengival costumam ser resolvidos pelo dentista generalista com limpeza profissional e orientação de higiene. Já quadros mais avançados de periodontite, com perda óssea significativa, geralmente exigem o acompanhamento de um periodontista, que pode indicar desde raspagem profunda até cirurgia.

Esse especialista também está envolvido no planejamento de implantes dentários em pacientes com pouco osso disponível, trabalhando em conjunto com o implantodontista para preparar a região antes da cirurgia. A relação entre saúde periodontal e sucesso de outros tratamentos é direta.',
'https://images.pexels.com/photos/10018230/pexels-photo-10018230.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '92 days'),

('Implantodontista: o especialista em implantes', 'implantodontista-o-especialista-em-implantes',
'Colocar um implante dentário exige planejamento cirúrgico detalhado. Conheça o especialista responsável.',
'A implantodontia é a especialidade focada no planejamento e na instalação de implantes dentários — parafusos de titânio que substituem a raiz de dentes perdidos. O implantodontista avalia a quantidade e qualidade do osso disponível, muitas vezes com apoio de tomografias 3D, antes de definir o melhor posicionamento do implante.

Esse planejamento é essencial porque a posição do implante afeta diretamente o resultado estético e funcional da coroa que será instalada depois. Em casos onde há pouco osso, o especialista pode indicar procedimentos complementares, como enxertos ósseos, antes da cirurgia principal.

Depois da fase cirúrgica, o acompanhamento continua durante o período de osseointegração, quando o osso se funde ao implante, e na fase protética, quando a coroa é finalmente instalada. Todo o processo costuma envolver comunicação próxima entre implantodontista e protesista.',
'https://images.pexels.com/photos/6502305/pexels-photo-6502305.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '95 days'),

('Odontopediatra: por que levar seu filho a um especialista', 'odontopediatra-por-que-levar-seu-filho',
'Crianças não são "adultos pequenos" no consultório. Entenda o papel do odontopediatra.',
'A odontopediatria é a especialidade dedicada ao atendimento de bebês, crianças e adolescentes, com abordagens adaptadas a cada fase do desenvolvimento. O odontopediatra é treinado não só tecnicamente, mas também para lidar com o comportamento infantil, tornando a experiência no consultório menos assustadora.

Esse profissional acompanha marcos importantes, como a erupção dos dentes de leite e permanentes, orienta os pais sobre hábitos como uso de chupeta e mamadeira, e trata cáries e traumas específicos da infância. Identificar problemas cedo evita complicações maiores no futuro.

Levar a criança a um odontopediatra desde os primeiros anos também ajuda a criar uma relação positiva com o cuidado bucal, reduzindo o medo de dentista na vida adulta. Consultas regulares, mesmo sem problemas aparentes, fazem parte dessa construção.',
'https://images.pexels.com/photos/6502542/pexels-photo-6502542.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '98 days'),

('Cirurgião bucomaxilofacial: quando é necessário', 'cirurgiao-bucomaxilofacial-quando-e-necessario',
'Extrações complexas, traumas faciais e cirurgias ortognáticas: conheça essa especialidade cirúrgica.',
'A cirurgia e traumatologia bucomaxilofacial é a especialidade odontológica voltada para procedimentos cirúrgicos mais complexos na região da boca, face e mandíbula. Isso inclui desde extrações de dentes do siso impactados até cirurgias para corrigir alterações no crescimento da mandíbula.

Esse especialista também atua em casos de trauma facial, cistos e tumores na região bucal, e biópsias para investigação de lesões suspeitas. Em muitos casos, o tratamento envolve trabalho conjunto com outras especialidades médicas, como otorrinolaringologia ou cirurgia plástica.

O encaminhamento a um cirurgião bucomaxilofacial normalmente parte do dentista generalista ou de outro especialista, quando o caso exige um nível de complexidade cirúrgica além do atendimento odontológico de rotina. É uma especialidade que costuma atuar em ambiente hospitalar para os casos mais extensos.',
'https://images.pexels.com/photos/6291170/pexels-photo-6291170.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '101 days'),

('Protesista: o especialista em próteses e reabilitação oral', 'protesista-o-especialista-em-proteses',
'Devolver função e estética após perda de dentes é trabalho do especialista em prótese dentária.',
'A prótese dentária, também chamada de reabilitação oral, é a especialidade voltada para devolver função e estética a pacientes que perderam um ou mais dentes. O protesista trabalha com próteses fixas, removíveis e sobre implantes, sempre buscando um resultado que se harmonize com o restante da boca.

O processo costuma envolver moldagens ou escaneamento digital, testes de prova antes da confecção final, e ajustes finos até que a prótese fique confortável e funcional. Esse especialista também trabalha em conjunto com laboratórios de prótese dentária, onde os aparelhos protéticos são confeccionados sob medida.

Casos mais complexos de reabilitação, envolvendo múltiplos dentes ou mudanças significativas na mordida, costumam exigir planejamento conjunto entre protesista, implantodontista e, às vezes, ortodontista — cada um contribuindo com sua parte do tratamento.',
'https://images.pexels.com/photos/20130737/pexels-photo-20130737.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Especialidades Odontológicas', 'publicado', now() - interval '104 days'),

('Como funciona um plano de tratamento odontológico', 'como-funciona-um-plano-de-tratamento',
'Um bom plano de tratamento organiza prioridades, prazos e custos. Entenda como ele é montado.',
'Depois da avaliação inicial, o dentista organiza os problemas identificados em um plano de tratamento: um roteiro que define o que precisa ser feito, em que ordem e com qual urgência. Problemas que causam dor ou risco de infecção costumam ser priorizados em relação a procedimentos estéticos, por exemplo.

Um plano de tratamento bem apresentado inclui as opções disponíveis para cada problema, quando existir mais de uma alternativa, com uma explicação clara sobre vantagens, limitações e valores de cada uma. Isso permite que o paciente participe da decisão, e não apenas receba instruções.

É comum que o plano seja executado ao longo de várias consultas, especialmente quando envolve etapas que precisam de tempo de cicatrização entre si, como no caso de implantes. Revisar o plano periodicamente com o dentista ajuda a manter o tratamento no caminho certo.',
'https://images.pexels.com/photos/4269681/pexels-photo-4269681.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '107 days'),

('Odontologia baseada em evidências: por que isso importa', 'odontologia-baseada-em-evidencias',
'Nem toda informação sobre saúde bucal encontrada na internet tem respaldo científico. Entenda por que isso importa.',
'Odontologia baseada em evidências significa tomar decisões clínicas apoiadas em pesquisa científica de qualidade, na experiência clínica do profissional e nas necessidades específicas de cada paciente — e não apenas em tradição ou modismos.

Esse conceito ganhou ainda mais importância com a facilidade de acesso a informações (e desinformações) sobre saúde bucal na internet. Tratamentos caseiros milagrosos ou produtos sem comprovação científica circulam facilmente nas redes sociais, muitas vezes prometendo resultados que não se sustentam.

Um dentista que se atualiza constantemente, participa de cursos e acompanha publicações científicas está mais preparado para recomendar tratamentos realmente eficazes — e para explicar, com base em evidências, por que certas promessas milagrosas não fazem sentido clínico.',
'https://images.pexels.com/photos/5355715/pexels-photo-5355715.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '110 days'),

('Ética e sigilo no consultório odontológico', 'etica-e-sigilo-no-consultorio-odontologico',
'Confidencialidade e respeito ao paciente não são apenas boas práticas — são obrigações éticas da profissão.',
'A relação entre dentista e paciente é baseada em confiança, e parte importante dessa confiança vem do sigilo profissional. Informações sobre o histórico de saúde, tratamentos realizados e qualquer dado pessoal compartilhado durante o atendimento são protegidos por sigilo, conforme o Código de Ética Odontológica.

Esse compromisso ético também envolve transparência: o paciente tem direito a entender seu diagnóstico, as opções de tratamento disponíveis e os riscos envolvidos, para poder consentir de forma informada com qualquer procedimento. Omitir informações relevantes ou pressionar por tratamentos desnecessários fere princípios básicos da profissão.

Prontuários odontológicos, sejam físicos ou digitais, também precisam ser armazenados com segurança e só podem ser compartilhados com terceiros mediante autorização do paciente, exceto em situações previstas por lei. Esse cuidado faz parte do compromisso profissional com quem confia seu cuidado a um dentista.',
'https://images.pexels.com/photos/4269276/pexels-photo-4269276.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '113 days'),

('A importância do acompanhamento contínuo com o mesmo dentista', 'importancia-do-acompanhamento-continuo',
'Trocar de dentista a cada consulta tem custos invisíveis. Veja por que manter um acompanhamento contínuo compensa.',
'Manter um acompanhamento de longo prazo com o mesmo dentista traz vantagens que vão além da comodidade. Com o tempo, o profissional constrói um histórico detalhado da saúde bucal do paciente, o que facilita identificar mudanças sutis, como o início de uma cárie ou um desgaste progressivo do esmalte.

Esse histórico também evita repetição desnecessária de exames e perguntas, já que o dentista já conhece alergias, tratamentos anteriores e particularidades do paciente. Em situações de urgência, um dentista que já conhece o caso consegue agir com mais agilidade e segurança.

Trocar de profissional constantemente não impede um bom atendimento pontual, mas dificulta esse tipo de acompanhamento de longo prazo. Quando possível, manter uma relação contínua com um dentista de confiança tende a resultar em um cuidado mais preventivo e menos reativo.',
'https://images.pexels.com/photos/6627424/pexels-photo-6627424.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '116 days'),

('Perguntas frequentes que pacientes fazem no consultório', 'perguntas-frequentes-que-pacientes-fazem',
'Reunimos as dúvidas mais comuns que pacientes trazem ao consultório odontológico — e respostas diretas para elas.',
'"Vou sentir dor?" é provavelmente a pergunta mais comum em consultórios odontológicos. Com o uso correto de anestesia e técnicas atuais, a maioria dos procedimentos causa desconforto mínimo, e qualquer dor esperada costuma ser comunicada com antecedência pelo dentista.

Outra dúvida frequente é sobre a real necessidade de um tratamento: pacientes querem entender se um procedimento pode esperar ou é urgente. Um bom profissional explica essa priorização com clareza, sem gerar pressão desnecessária para decisões imediatas.

Perguntas sobre duração de tratamentos, valores, formas de pagamento e cuidados pós-procedimento também aparecem com frequência. Não existe pergunta "boba" nesse contexto — parte do papel do dentista é justamente traduzir termos técnicos em explicações que façam sentido para quem não é da área.',
'https://images.pexels.com/photos/10988650/pexels-photo-10988650.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Cuidado Profissional', 'publicado', now() - interval '119 days');

insert into services (name, description, price, sort_order) values
  ('Limpeza e Profilaxia', 'Prevenção completa para manter seu sorriso saudável o ano todo.', 80, 0),
  ('Clareamento Dental', 'Resultados visíveis desde a primeira sessão, com segurança.', 350, 1),
  ('Implantes', 'Recupere a função e a estética do seu sorriso com tecnologia 3D.', 1800, 2),
  ('Ortodontia', 'Aparelhos convencionais e alinhadores invisíveis.', 800, 3),
  ('Odontopediatria', 'Atendimento especial e lúdico para as crianças.', 90, 4),
  ('Urgência 24h', 'Dor de dente não espera. Atendemos emergências todos os dias.', 150, 5);
