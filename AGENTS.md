<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Regras do projeto (Dentista do Povo)

### Tutorial obrigatório a cada atualização

Toda mudança que o usuário percebe (módulo novo, tela nova, botão, campo,
comportamento) **precisa** atualizar o módulo Tutorial em `src/lib/tutorial.ts`
no mesmo commit:

1. Adicione uma entrada **no topo** de `TUTORIAL_UPDATES` (Novidades) com a data
   (AAAA-MM-DD), um título curto, os `sections` afetados e os itens do que mudou.
2. Atualize a seção do módulo em `TUTORIAL_SECTIONS` (passo a passo e dicas).
   Módulo novo = seção nova, no grupo certo (`TUTORIAL_GROUPS`).
3. Escreva em português simples, para a equipe da clínica (não para programadores).

### Antes de commitar

- Rode `bun run check` (tipos, lint, formatação e testes) — precisa passar.
- Banco: a camada de dados fica em `src/integrations/mysql/` (por dentro usa o
  Postgres do Supabase). Tabelas novas = nova migration numerada em
  `supabase/migrations/` + colunas em `tables.ts` e `types.ts`.
