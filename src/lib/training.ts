// Trilhas guiadas do Tutorial: passo a passo de ponta a ponta, com links para
// os módulos e progresso salvo no projeto (preferência "trainingProgress").
//
// REGRA DO PROJETO: se um fluxo citado aqui mudar (nomes de botões, abas,
// etapas), atualize também o passo correspondente desta trilha.

export type TrainingStep = {
  id: string;
  title: string;
  text: string;
  /** Módulo para abrir ao fazer o passo. */
  to?: string;
  toLabel?: string;
  /** Como saber que deu certo. */
  check?: string;
};

export type TrainingChapter = {
  id: string;
  emoji: string;
  title: string;
  goal: string;
  steps: TrainingStep[];
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explain: string;
};

export type Training = {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  audience: string;
  duration: string;
  example?: { title: string; text: string };
  chapters: TrainingChapter[];
  quiz?: QuizQuestion[];
};

export const TRAININGS: Training[] = [
  {
    id: "trilha-inicio",
    emoji: "🚀",
    title: "Do início ao fim: do primeiro acesso ao pagamento",
    summary:
      "O caminho completo de um atendimento na plataforma: preparar o sistema, receber o paciente, avaliar, fazer o orçamento, executar a restauração e receber o valor.",
    audience: "Toda a equipe (dentista, recepção e financeiro)",
    duration: "≈ 30 minutos",
    example: {
      title: "Caso de exemplo",
      text: "Ana Souza, 32 anos, chega com sensibilidade no dente 36. Na avaliação, o doutor encontra uma cárie na face oclusal e indica uma restauração em resina. Siga a trilha fazendo esse atendimento na plataforma — use um paciente de teste se preferir e apague depois.",
    },
    chapters: [
      {
        id: "preparar",
        emoji: "⚙️",
        title: "Preparar a plataforma",
        goal: "Deixar os dados da clínica, os preços e as formas de pagamento prontos antes do primeiro atendimento.",
        steps: [
          {
            id: "acesso",
            title: "Entre na área restrita",
            text: "Acesse /entrar com o email e a senha de administrador. No primeiro acesso, o sistema cria a conta de administrador. Guarde a senha: ela também confirma cancelamentos no Financeiro.",
            to: "/admin",
            toLabel: "Abrir o painel",
            check: "Você vê o painel com os módulos.",
          },
          {
            id: "dados-clinica",
            title: "Confira os dados da clínica",
            text: "Em Configurações, revise nome da clínica, telefone, WhatsApp e endereço. Em Modelos de Documentos › Dados da clínica, confira o nome do dentista e o CRO — eles saem em receitas, atestados e propostas.",
            to: "/admin/configuracoes",
            toLabel: "Abrir Configurações",
            check: "Nome, CRO, telefone e endereço estão corretos.",
          },
          {
            id: "formas-pagamento",
            title: "Ative as formas de pagamento",
            text: "Em Configurações › Formas de pagamento, deixe ativas só as que a clínica aceita (PIX, dinheiro, cartões, boleto...).",
            to: "/admin/configuracoes",
            toLabel: "Abrir Configurações",
            check: "Só as formas usadas aparecem ao receber um pagamento.",
          },
          {
            id: "precos",
            title: "Revise os preços em Tratamentos",
            text: "Abra Tratamentos e confira o valor da Restauração e dos outros procedimentos. Esses preços são sugeridos automaticamente no odontograma e no orçamento.",
            to: "/admin/tratamentos",
            toLabel: "Abrir Tratamentos",
            check: "A Restauração tem o valor que a clínica cobra.",
          },
        ],
      },
      {
        id: "receber-paciente",
        emoji: "👤",
        title: "Receber o paciente",
        goal: "Cadastrar a Ana, registrar a saúde dela e marcar a avaliação.",
        steps: [
          {
            id: "cadastrar",
            title: "Cadastre o paciente",
            text: "Em Pacientes › Novo paciente, preencha nome, CPF, nascimento, telefone e endereço. Se for menor de idade, a chave Paciente menor de idade liga sozinha: informe nome e telefone do responsável.",
            to: "/admin/pacientes",
            toLabel: "Abrir Pacientes",
            check: "A Ana aparece na lista com um código (ex.: #000012).",
          },
          {
            id: "anamnese",
            title: "Preencha a anamnese",
            text: "Clique no nome da Ana › Abrir prontuário › aba Prontuário (anamnese). Marque alergias, doenças, medicamentos e hábitos. Alertas importantes aparecem depois na janela do paciente.",
            to: "/admin/pacientes",
            toLabel: "Abrir Pacientes",
            check: "A anamnese está salva no prontuário.",
          },
          {
            id: "agendar",
            title: "Marque a consulta de avaliação",
            text: "Na Agenda, clique em Nova consulta, escolha a Ana, o dia, o horário e o tratamento “Avaliação”. Se quiser, confirme com a paciente pelo WhatsApp.",
            to: "/admin/agenda",
            toLabel: "Abrir Agenda",
            check: "A consulta aparece no calendário no dia marcado.",
          },
        ],
      },
      {
        id: "avaliar",
        emoji: "🦷",
        title: "Avaliação no Odontograma",
        goal: "Registrar o que foi encontrado no exame e o que vai ser feito.",
        steps: [
          {
            id: "abrir-odontograma",
            title: "Abra o odontograma da paciente",
            text: "No módulo Odontograma (ao lado de Receitas), busque a Ana. Ou, no prontuário dela, abra a aba Odontograma.",
            to: "/admin/odontograma",
            toLabel: "Abrir Odontograma",
            check: "Os dentes da Ana aparecem na tela.",
          },
          {
            id: "registrar-carie",
            title: "Registre a cárie no dente 36",
            text: "Clique no dente 36, marque a face Oclusal, escolha a Situação atual “Cárie” e escreva uma observação (ex.: cárie média, sensibilidade ao frio).",
            check: "A face oclusal do 36 fica vermelha no desenho.",
          },
          {
            id: "planejar",
            title: "Planeje a restauração",
            text: "No mesmo dente, escolha o Procedimento planejado “Restauração”. O valor vem do catálogo de Tratamentos — ajuste se precisar — e clique em Salvar Registro.",
            check: "A Restauração do dente 36 aparece no quadro Plano de tratamento.",
          },
        ],
      },
      {
        id: "orcamento",
        emoji: "🧾",
        title: "Orçamento e aprovação",
        goal: "Transformar o plano em orçamento e conseguir a aprovação da paciente.",
        steps: [
          {
            id: "gerar-orcamento",
            title: "Gere o orçamento pelo plano",
            text: "No quadro Plano de tratamento, deixe a Restauração marcada, confira o valor e clique em Gerar orçamento › Criar orçamento.",
            check: "Aparece “Orçamento criado” com o total.",
          },
          {
            id: "proposta",
            title: "Mostre a proposta para a paciente",
            text: "Clique em Ver proposta para abrir a proposta com os itens e o total, pronta para imprimir ou salvar em PDF.",
            check: "A proposta mostra “Restauração — Dente 36 (Oclusal)” e o valor.",
          },
          {
            id: "aprovar",
            title: "Envie e aprove",
            text: "Em Orçamentos, clique em Enviar quando passar o orçamento para a paciente e em Aprovar quando ela aceitar.",
            to: "/admin/orcamentos",
            toLabel: "Abrir Orçamentos",
            check: "O orçamento fica com a etiqueta Aprovado.",
          },
        ],
      },
      {
        id: "tratamento",
        emoji: "🪥",
        title: "Fazer a restauração",
        goal: "Agendar, executar e registrar o tratamento.",
        steps: [
          {
            id: "agendar-sessao",
            title: "Agende a sessão",
            text: "Na Agenda, marque uma nova consulta para a Ana com o tratamento “Restauração”.",
            to: "/admin/agenda",
            toLabel: "Abrir Agenda",
            check: "A sessão aparece no calendário.",
          },
          {
            id: "concluir-dente",
            title: "Registre no odontograma",
            text: "Depois de restaurar, abra o dente 36, edite o registro da Restauração: Situação atual “Restauração” e Procedimento realizado “Concluído”. Se quiser, anexe a foto ou radiografia.",
            to: "/admin/odontograma",
            toLabel: "Abrir Odontograma",
            check: "A face oclusal do 36 fica azul e o histórico mostra Concluído.",
          },
          {
            id: "evolucao",
            title: "Escreva a evolução clínica",
            text: "No prontuário, aba Evoluções › Nova evolução: descreva o que foi feito (material, anestesia, orientações).",
            to: "/admin/pacientes",
            toLabel: "Abrir Pacientes",
            check: "A evolução aparece com a data de hoje.",
          },
          {
            id: "documento",
            title: "Emita receita ou atestado, se precisar",
            text: "Em Modelos de Documentos, escolha Receituário ou Atestado, busque a Ana e preencha os campos (medicamento, horário, dias). Imprima ou baixe em PDF.",
            to: "/admin/modelos",
            toLabel: "Abrir Modelos",
            check: "O documento sai com os dados da clínica e da paciente.",
          },
        ],
      },
      {
        id: "receber",
        emoji: "💰",
        title: "Receber o valor",
        goal: "Registrar o pagamento da Ana e fechar o atendimento.",
        steps: [
          {
            id: "lancar",
            title: "Leve o orçamento ao Caixa",
            text: "Em Orçamentos, no orçamento aprovado, clique em Finalizar no Caixa (abre o Caixa com os itens da Ana) — ou, se ela vai pagar depois, use ⋯ › Lançar no Financeiro (a receber).",
            to: "/admin/orcamentos",
            toLabel: "Abrir Orçamentos",
            check: "O valor aparece no Financeiro em A receber.",
          },
          {
            id: "receber",
            title: "Receba o pagamento",
            text: "No Financeiro, abra a aba Lançamentos e clique em Receber na linha da Ana. Escolha a forma (ex.: PIX ou cartão em 2x) e, se combinado, use + Aplicar desconto ou acréscimo. Confirme.",
            to: "/admin/financeiro",
            toLabel: "Abrir Financeiro",
            check: "A linha fica como Recebido e o valor soma em Recebido e no gráfico.",
          },
          {
            id: "caixa",
            title: "Ou cobre direto no Caixa (PDV)",
            text: "Pagamento na hora, sem orçamento? No módulo Caixa, abra o caixa do dia (se ainda estiver fechado), busque “Restauração”, escolha a Ana como cliente, clique em Finalizar venda (F2), escolha a forma e confirme. Em dinheiro, informe o valor recebido para ver o troco.",
            to: "/admin/caixa",
            toLabel: "Abrir o Caixa",
            check:
              "Aparece “Venda concluída” e a venda entra em Lançamentos com os itens vendidos.",
          },
          {
            id: "erro",
            title: "Errou? Saiba cancelar",
            text: "Se lançou errado ou precisou devolver, use ⋯ › Cancelar lançamento: escreva a justificativa, informe a devolução e confirme com a senha do administrador.",
            check: "O lançamento cancelado fica riscado e mostra a justificativa.",
          },
        ],
      },
      {
        id: "depois",
        emoji: "📅",
        title: "Depois do atendimento",
        goal: "Manter a paciente voltando e os dados seguros.",
        steps: [
          {
            id: "retorno",
            title: "Marque o retorno",
            text: "Agende a revisão (por exemplo, em 6 meses) na Agenda, para a Ana não esquecer da manutenção.",
            to: "/admin/agenda",
            toLabel: "Abrir Agenda",
          },
          {
            id: "relatorios",
            title: "Acompanhe os números",
            text: "Em Relatórios e no Financeiro, veja receita, consultas e o que falta receber no mês.",
            to: "/admin/relatorios",
            toLabel: "Abrir Relatórios",
          },
          {
            id: "backup",
            title: "Faça backup",
            text: "Em Backup, baixe o arquivo com os dados da clínica pelo menos uma vez por semana e guarde em local seguro.",
            to: "/admin/backup",
            toLabel: "Abrir Backup",
            check: "O arquivo .json foi baixado.",
          },
        ],
      },
    ],
  },
  {
    id: "treino-levantamento",
    emoji: "🎓",
    title: "Treinamento: Levantamento — do odontograma ao orçamento",
    summary:
      "Como fazer o levantamento completo da boca do paciente no Odontograma, montar o plano de tratamento com valores e transformar em orçamento aprovado.",
    audience: "Dentistas e auxiliares que fazem a avaliação",
    duration: "≈ 20 minutos + teste",
    example: {
      title: "Caso para treinar",
      text: "Carlos, 45 anos: cárie no 16 (oclusal e mesial), restauração antiga com infiltração no 26, dente 38 com extração indicada e 46 que precisa de canal e coroa. Faça o levantamento completo dele e chegue ao orçamento.",
    },
    chapters: [
      {
        id: "preparo",
        emoji: "🧭",
        title: "Antes de começar",
        goal: "Entender a tela e conferir os preços.",
        steps: [
          {
            id: "precos",
            title: "Confira o catálogo de Tratamentos",
            text: "Os valores do levantamento vêm de Tratamentos. Confira os preços de Restauração, Tratamento de canal, Coroa e Extração antes de começar.",
            to: "/admin/tratamentos",
            toLabel: "Abrir Tratamentos",
          },
          {
            id: "tela",
            title: "Conheça a tela do odontograma",
            text: "Escolha Dentição Permanente ou Decídua e a vista (completa, superior, inferior). Cada dente mostra o desenho e, embaixo, o quadradinho das 5 faces. A Legenda mostra a cor de cada situação.",
            to: "/admin/odontograma",
            toLabel: "Abrir Odontograma",
            check: "Você sabe onde ficam o arco superior, o inferior e a legenda.",
          },
          {
            id: "numeracao",
            title: "Lembre a numeração",
            text: "Quadrante 1 = superior direito (11–18), 2 = superior esquerdo (21–28), 3 = inferior esquerdo (31–38), 4 = inferior direito (41–48). Decíduos: 51–85. O lado direito do paciente aparece à esquerda da tela.",
          },
        ],
      },
      {
        id: "exame",
        emoji: "🔍",
        title: "Registrar o exame, dente por dente",
        goal: "Anotar a situação atual de cada dente com problema.",
        steps: [
          {
            id: "dente-faces",
            title: "Selecione o dente e as faces",
            text: "Clique no dente (no celular, o painel sobe de baixo). Marque as faces afetadas no desenho ou nos botões Oclusal, Mesial, Distal, Vestibular e Palatina/Lingual. A face marcada fica destacada.",
            check: "A dica mostra “2 face(s) marcada(s): Oclusal, Mesial” no dente 16.",
          },
          {
            id: "situacao",
            title: "Escolha a situação atual",
            text: "Situação atual = o que existe hoje no dente: Cárie, Restauração, Canal, Extração indicada, Fratura... As faces pintam com a cor da situação.",
            check: "No 16, as faces ficam vermelhas (Cárie).",
          },
          {
            id: "obs-fotos",
            title: "Anote e anexe imagens",
            text: "Use Observações clínicas para detalhes (profundidade, sensibilidade) e Anexos para fotos e radiografias do dente. Salve o registro.",
            check: "O histórico do dente mostra o registro com data e dentista.",
          },
          {
            id: "todos-dentes",
            title: "Repita para todos os dentes com alteração",
            text: "Faça o 26 (restauração com infiltração), o 38 (Extração indicada) e o 46 (Canal). Dentes saudáveis não precisam de registro.",
            check: "O odontograma mostra as cores certas nos 4 dentes.",
          },
        ],
      },
      {
        id: "plano",
        emoji: "🗂️",
        title: "Montar o plano de tratamento",
        goal: "Definir o que vai ser feito em cada dente e quanto custa.",
        steps: [
          {
            id: "planejado",
            title: "Escolha o procedimento planejado",
            text: "Em cada registro, escolha o Procedimento planejado (Restauração, Tratamento de canal, Coroa, Extração...). O campo Valor do procedimento já vem com o preço do catálogo — ajuste se for um caso diferente.",
            check: "Cada procedimento aparece no quadro Plano de tratamento com valor.",
          },
          {
            id: "mais-de-um",
            title: "Dente com mais de um procedimento",
            text: "O 46 precisa de canal e depois coroa. No quadro Plano de tratamento, use Adicionar: escolha o dente 46 e o procedimento Coroa, sem abrir o desenho.",
            check: "O plano mostra “46 Tratamento de canal” e “46 Coroa”.",
          },
          {
            id: "corrigir",
            title: "Corrija erros",
            text: "Lançou algo errado? Use a lixeira da linha ou marque vários e clique em Limpar selecionados. O que já foi registrado no dente continua no histórico.",
            check: "O item saiu do plano.",
          },
          {
            id: "revisar-valores",
            title: "Revise o total",
            text: "Confira os valores linha a linha. O total dos itens marcados aparece no topo do quadro.",
          },
        ],
      },
      {
        id: "orcar",
        emoji: "🧾",
        title: "Do plano ao orçamento aprovado",
        goal: "Gerar o orçamento, apresentar e registrar a decisão do paciente.",
        steps: [
          {
            id: "gerar",
            title: "Gere o orçamento",
            text: "Marque os itens que o paciente vai fazer agora e clique em Gerar orçamento. Procedimentos novos (que não existem em Tratamentos) são cadastrados lá com o valor usado — deixe marcado Cadastrar em Tratamentos.",
            check: "Aparece “Orçamento criado” com a quantidade de itens e o total.",
          },
          {
            id: "apresentar",
            title: "Apresente a proposta",
            text: "Use Ver proposta para mostrar ao paciente os itens, valores e total, em tela, impresso ou em PDF. Explique as prioridades (ex.: canal antes da coroa).",
            check: "A proposta lista todos os itens do plano.",
          },
          {
            id: "status",
            title: "Registre a decisão",
            text: "Em Orçamentos (já filtrado no paciente), use Enviar e depois Aprovar ou Recusar. Itens não aprovados podem ficar para depois — o plano continua no odontograma.",
            to: "/admin/orcamentos",
            toLabel: "Abrir Orçamentos",
            check: "Os itens aprovados ficam com a etiqueta Aprovado.",
          },
          {
            id: "financeiro",
            title: "Receba no Caixa",
            text: "No orçamento aprovado, clique em Finalizar no Caixa: a recepção recebe ali mesmo (à vista, parcelado, com desconto ou acréscimo). Se o paciente vai pagar depois, use ⋯ › Lançar no Financeiro (a receber).",
            to: "/admin/caixa",
            toLabel: "Abrir Caixa",
          },
        ],
      },
    ],
    quiz: [
      {
        question:
          "O paciente tem cárie no dente 16 e vai fazer restauração. Onde cada informação entra?",
        options: [
          "Cárie em Procedimento planejado e Restauração em Situação atual",
          "Cárie em Situação atual e Restauração em Procedimento planejado",
          "As duas em Observações clínicas",
        ],
        answer: 1,
        explain:
          "Situação atual é o que existe hoje no dente (Cárie). Procedimento planejado é o que vai ser feito (Restauração) — é ele que entra no Plano de tratamento e no orçamento.",
      },
      {
        question: "Qual é o quadrante do dente 36?",
        options: ["Superior direito", "Inferior esquerdo", "Inferior direito"],
        answer: 1,
        explain: "Dentes que começam com 3 ficam no quadrante inferior esquerdo (31 a 38).",
      },
      {
        question: "O dente 46 precisa de canal e coroa. Como colocar os dois no plano?",
        options: [
          "Não dá, só um procedimento por dente",
          "Criar dois pacientes",
          "Registrar o canal no dente e usar Adicionar no Plano de tratamento para a coroa",
        ],
        answer: 2,
        explain:
          "Cada registro tem um procedimento planejado; o botão Adicionar do Plano de tratamento inclui outro procedimento no mesmo dente.",
      },
      {
        question: "Gerei o orçamento e um procedimento não existia em Tratamentos. O que acontece?",
        options: [
          "Ele é cadastrado em Tratamentos com o valor usado, se a opção estiver marcada",
          "O orçamento não é criado",
          "O valor vira zero",
        ],
        answer: 0,
        explain:
          "Com “Cadastrar em Tratamentos” marcado, o procedimento entra no catálogo com o valor usado, e você ajusta o preço depois em Tratamentos.",
      },
      {
        question: "O paciente aprovou. Qual o caminho até receber o valor?",
        options: [
          "Odontograma › Concluído (o pagamento entra sozinho)",
          "Configurações › Formas de pagamento",
          "Orçamentos › Aprovar › Finalizar no Caixa › Finalizar venda",
        ],
        answer: 2,
        explain:
          "Aprovado o orçamento, Finalizar no Caixa leva os itens para o Caixa (PDV); em Finalizar venda você escolhe a forma de pagamento e o orçamento fica ligado ao pagamento.",
      },
    ],
  },
];

export function trainingSteps(t: Training) {
  return t.chapters.flatMap((c) => c.steps.map((s) => `${c.id}/${s.id}`));
}
