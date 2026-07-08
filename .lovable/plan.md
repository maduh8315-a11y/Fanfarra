# Plano — Novas páginas e atualizações do Fanfarra

O escopo é grande (9 novas páginas + 5 atualizações + 13 formulários específicos). Vou entregar tudo em **3 fases** para você poder validar o caminho antes de eu seguir. Tudo mantém a paleta atual (`var(--fan-bg)`, `var(--fan-pink)`, `var(--fan-pink-light)`, `#CC0022`, `#FFE6F0`, `var(--fan-text-2)`) e usa apenas frontend + `localStorage` (sem backend ainda).

---

## Fase 1 — Núcleo do "Adicionar/Editar" + Biblioteca

Mudanças que afetam o fluxo principal e o modelo de dados.

1. **Extensão do tipo `Work`** (`src/lib/fanfarra/types.ts`)
   - Campos comuns novos: `startDate`, `endDate`, `genres[]`, `link`.
   - Campo `details: Record<string, any>` para guardar os campos específicos de cada tipo (episódio/temporada/estúdio/plataforma/autor/ISBN/horas/% etc.).
   - Lista de selos (`BADGES`) e desafios (`CHALLENGES`) como constantes.

2. **Página inicial do "Adicionar" — seleção de tipo** (`src/routes/add.index.tsx` substituindo o atual)
   - Header "O que quer adicionar?" + X.
   - Grid 3 colunas com 13 cards (ícones Lucide conforme spec).
   - Toca → `/add/$type`.

3. **Formulários específicos por tipo** (`src/routes/add.$type.tsx`)
   - Um único route file que renderiza o formulário certo via um mapa de "schemas de campos" por tipo (mais enxuto que 13 arquivos).
   - Componentes compartilhados:
     - `DatePickerTriple` (dia/mês/ano em 3 selects).
     - `ChipsField` (single/multi).
     - `RatingStars`.
     - `NumberField`, `TextField`, `UrlField` (com botão "Abrir link"), `Toggle`, `Slider`.
   - Inclui Data de início + Data de conclusão (esta desabilitada se status ≠ Concluído).
   - 13 schemas cobrindo todos os campos descritos (Anime, Manga, Manhwa, Manhua, Fanfic, Série, Filme, Livro, Jogo, Webtoon, Light Novel, Donghua, HQ).

4. **Edição de obra** (`src/routes/work.$id.edit.tsx`)
   - Reusa o mesmo formulário pré-preenchido.
   - Header "Editar obra", botão "Salvar alterações", botão vermelho "Excluir obra" com modal de confirmação.
   - Ícone de lápis na tela de detalhe passa a navegar para essa rota.

5. **Filtro/ordenação da Biblioteca** (`src/routes/library.tsx` + `FilterSheet.tsx`)
   - Ícone de funil no header abre bottom sheet (Sheet do shadcn em `side="bottom"`).
   - Ordenar por, Status, Tipo, Avaliação mínima, botão "Aplicar filtros", "Limpar tudo".

---

## Fase 2 — Novas páginas de navegação

6. **Notificações** — `src/routes/notifications.tsx` (mock de notificações no store, estado vazio).
7. **Recomendações** — `src/routes/recommendations.tsx` (3 seções: Mais adicionados / Em alta por categoria / Baseado na biblioteca; dados mockados a partir do store).
8. **Configurações** — `src/routes/settings.tsx` (seções Conta, Notificações, Privacidade, Sincronização, Assinatura, Estilo; toggles persistidos em `localStorage`).
9. **Perfil / Editar conta** — `src/routes/profile.tsx` (avatar, dados, estatísticas calculadas, grid de selos com modal).
10. **Sobre o app** — `src/routes/about.tsx`.
11. **Header da Home** — botão `MoreHorizontal` com dropdown (Recomendações / Fanfarra Awards / Novidades), sino → `/notifications`.
12. **Drawer lateral** (`AppShell.tsx`) — adicionar itens: Configurações, Sobre, Desafios Fandom, Coleções Públicas, Wrapped Anual, Fanfarra Awards.

---

## Fase 3 — Páginas de eventos e comunidade

13. **Desafios Fandom** — `src/routes/challenges.tsx` (abas Em andamento/Concluídos/Todos, cards com progresso calculado, lista de desafios da spec).
14. **Coleções Públicas** — `src/routes/collections.tsx` (abas Descobrir/Minhas, mock de coleções, modal "Criar coleção" com toggle público/privado, persistência local).
15. **Wrapped Anual** — `src/routes/wrapped.tsx` (gate PRO, 8 slides full-screen com scroll vertical, dados calculados do store; botão "Compartilhar" apenas visual).
16. **Fanfarra Awards** — `src/routes/awards.tsx` (estados: Fora do período com countdown, Indicações abertas com accordion por grupo + tela de votação `awards.$category.tsx`, Votação final com top-5, Resultado com vencedores; voto bloqueado após confirmação via `localStorage`).

---

## Detalhes técnicos

- **Roteamento**: arquivos TanStack file-based em `src/routes/`; sem editar `routeTree.gen.ts` (auto-gerado pelo Vite plugin).
- **Store**: estender `src/lib/fanfarra/store.ts` com helpers para filtros, settings, notifications, badges, collections, awards votes — tudo em `localStorage` com chaves separadas (`fanfarra:settings`, `fanfarra:notifications`, etc.).
- **Componentes compartilhados** em `src/components/fanfarra/forms/` (DatePickerTriple, ChipsField, RatingStars, etc.) para evitar duplicação entre adicionar/editar/filtro.
- **Dropdown do header** usa `DropdownMenu` do shadcn.
- **Bottom sheet** usa `Sheet` do shadcn (`side="bottom"`).
- **Sem backend**: tudo offline-first. Itens de Conta ("Alterar senha", "Excluir conta") ficam visuais com modal mock — quando você quiser conectar autenticação real, ativamos o Lovable Cloud.
- **Funcionalidades dependentes de mídia/câmera** (alterar foto de perfil, compartilhar Wrapped como imagem) ficam como botões visuais nesta fase.

---

## O que vou entregar agora

Se aprovar, começo executando a **Fase 1 inteira** numa rodada (é o que destrava tudo: novo modelo de dados, fluxo de adicionar específico por tipo, edição e filtro). Depois sigo Fase 2 e Fase 3 nas próximas mensagens, para você poder revisar entre elas sem ficar com um diff gigante de uma vez só.

Aprovar para eu iniciar pela Fase 1?
