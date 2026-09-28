// Páginas legais do site (Política de Privacidade e Termos de Uso), editáveis
// em CMS Site › Páginas. Salvas em site_content (ids "privacy" e "terms").
// Formato do texto: parágrafos separados por linha em branco, "## " para
// subtítulos e "- " para listas (o mesmo do blog).

export type LegalPageId = "privacy" | "terms";

export type LegalPage = { title: string; updatedAt: string; body: string };

export const LEGAL_PAGES: { id: LegalPageId; path: string; label: string }[] = [
  { id: "privacy", path: "/privacidade", label: "Política de Privacidade" },
  { id: "terms", path: "/termos", label: "Termos de Uso" },
];

const CONTACT =
  "Dentista do Povo — Dr. Álvaro Augusto Battiston (CRO/RO 2853)\nAvenida Cujubim, nº 2112, Setor 02, Cujubim - RO, CEP 76864-000\nTelefone / WhatsApp: (69) 98492-0788";

export const DEFAULT_LEGAL: Record<LegalPageId, LegalPage> = {
  privacy: {
    title: "Política de Privacidade",
    updatedAt: "2026-09-28",
    body: `Esta Política de Privacidade explica como o Dentista do Povo coleta, usa e protege os dados pessoais de quem visita este site e de nossos pacientes, de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).

## Quem somos

${CONTACT}

## Quais dados coletamos

- Dados que você nos informa: nome, telefone e mensagens enviadas pelo chat do site ou pelos formulários de contato e agendamento.
- Dados de pacientes: informações cadastrais e de saúde necessárias ao atendimento odontológico, registradas em nosso sistema interno com acesso restrito à equipe.
- Dados de navegação: endereço IP, tipo de navegador, páginas visitadas e data e hora de acesso, coletados automaticamente para segurança e funcionamento do site.

## Para que usamos os dados

- Responder mensagens, agendar consultas e prestar o atendimento odontológico.
- Cumprir obrigações legais e regulatórias, como a guarda do prontuário.
- Manter a segurança do site e evitar abusos.
- Exibir anúncios, quando o site tiver publicidade ativa (veja a seção sobre cookies).

Não vendemos seus dados pessoais.

## Cookies e publicidade

Cookies são pequenos arquivos salvos no seu navegador. Usamos cookies essenciais para o funcionamento do site, como manter a conversa do chat e a sessão da área restrita.

Este site pode exibir anúncios do Google AdSense. O Google e seus parceiros usam cookies para exibir anúncios com base nas suas visitas anteriores a este e a outros sites. Você pode desativar os anúncios personalizados nas Configurações de anúncios do Google (adssettings.google.com) e saber mais sobre como o Google usa dados em policies.google.com/technologies/ads.

Você também pode bloquear ou apagar cookies nas configurações do seu navegador; algumas funções do site podem deixar de funcionar.

## Compartilhamento de dados

Compartilhamos dados apenas quando necessário: com prestadores que hospedam e operam o site e o sistema (como serviços de hospedagem e banco de dados), com parceiros de publicidade conforme descrito acima e com autoridades, quando exigido por lei.

## Por quanto tempo guardamos

Guardamos os dados pelo tempo necessário às finalidades desta política. Os dados de prontuário odontológico são mantidos pelo prazo exigido pela legislação e pelas normas do Conselho Federal de Odontologia.

## Seus direitos

De acordo com a LGPD, você pode solicitar:

- Confirmação de que tratamos seus dados e acesso a eles.
- Correção de dados incompletos, inexatos ou desatualizados.
- Anonimização, bloqueio ou eliminação de dados desnecessários, quando a lei permitir.
- Informações sobre com quem compartilhamos seus dados.
- Revogação do consentimento, quando ele for a base do tratamento.

Para exercer seus direitos, fale conosco pelos contatos acima.

## Segurança

Adotamos medidas técnicas e administrativas para proteger os dados, como acesso restrito por senha à área administrativa, conexões criptografadas e registro de atividades. Nenhum sistema é totalmente imune a riscos, mas trabalhamos continuamente para reduzi-los.

## Alterações nesta política

Podemos atualizar esta política a qualquer momento. A data da última atualização aparece no topo desta página.`,
  },
  terms: {
    title: "Termos de Uso",
    updatedAt: "2026-09-28",
    body: `Ao acessar e usar este site, você concorda com estes Termos de Uso. Se não concordar, recomendamos não utilizar o site.

## Sobre o site

Este site pertence ao Dentista do Povo, clínica odontológica em Cujubim - RO, e tem o objetivo de apresentar nossos serviços, facilitar o contato e o agendamento e divulgar conteúdo informativo sobre saúde bucal.

${CONTACT}

## Conteúdo informativo

Os textos do blog e demais conteúdos têm caráter apenas informativo e educativo. Eles não substituem a consulta, o diagnóstico ou o tratamento feitos por um cirurgião-dentista. Em caso de dor, urgência ou dúvida sobre sua saúde, procure atendimento profissional.

## Agendamentos e atendimento

Pedidos de agendamento feitos pelo site, pelo chat ou pelo WhatsApp estão sujeitos à confirmação da clínica. Valores, condições de pagamento e planos de tratamento são informados na avaliação e podem variar conforme cada caso.

## Uso adequado

Ao usar o site, você se compromete a:

- Fornecer informações verdadeiras nos contatos e agendamentos.
- Não enviar conteúdo ofensivo, ilegal ou que viole direitos de terceiros.
- Não tentar acessar áreas restritas, interferir no funcionamento do site ou coletar dados de outros usuários.

## Propriedade intelectual

Textos, imagens, marcas e demais conteúdos deste site pertencem ao Dentista do Povo ou são usados com autorização, e não podem ser copiados ou reproduzidos sem permissão.

## Links e anúncios de terceiros

O site pode conter links e anúncios de terceiros. Não somos responsáveis pelo conteúdo, pelas ofertas ou pelas políticas desses sites.

## Privacidade

O tratamento de dados pessoais segue a nossa Política de Privacidade, disponível no rodapé do site.

## Alterações

Estes termos podem ser atualizados a qualquer momento. A data da última atualização aparece no topo desta página.

## Legislação

Estes termos são regidos pelas leis brasileiras.`,
  },
};

export function parseLegalPage(id: LegalPageId, json: string | null | undefined): LegalPage {
  const base = DEFAULT_LEGAL[id];
  if (!json) return base;
  try {
    const saved = JSON.parse(json) as Partial<LegalPage>;
    return {
      title: typeof saved.title === "string" && saved.title.trim() ? saved.title : base.title,
      updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : base.updatedAt,
      body: typeof saved.body === "string" && saved.body.trim() ? saved.body : base.body,
    };
  } catch {
    return base;
  }
}
