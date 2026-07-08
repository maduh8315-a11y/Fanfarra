# Fanfarra

Acompanhe animes, mangás, fanfics, livros, jogos e mais em um só lugar.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + Vite)
- Firebase (Auth + Firestore)
- ImgBB (upload de imagens/capas)
- Tailwind CSS v4
- Bun (gerenciador de pacotes)

## Pré-requisitos

- [Bun](https://bun.sh) instalado

## Configuração

1. Clone o repositório
2. Instale as dependências:

```bash
   bun install
```

3. Copie o arquivo de variáveis de ambiente e preencha com os valores reais:

```bash
   cp .env.example .env
```

Onde conseguir cada valor:

- `VITE_FIREBASE_*` → [Firebase Console](https://console.firebase.google.com/) → Configurações do projeto → Geral → seção "Seus apps" → SDK setup and configuration
- `IMGBB_API_KEY` → [api.imgbb.com](https://api.imgbb.com/) (conta grátis, gera uma chave de API)

4. Rode o projeto em modo desenvolvimento:

```bash
   bun run dev
```

## Scripts disponíveis

| Comando             | O que faz                                                       |
| ------------------- | --------------------------------------------------------------- |
| `bun run dev`       | Roda o projeto localmente em modo desenvolvimento               |
| `bun run build`     | Gera o build de produção                                        |
| `bun run build:dev` | Gera o build em modo desenvolvimento (útil pra debugar o build) |
| `bun run preview`   | Sobe um servidor local servindo o build de produção             |
| `bun run lint`      | Roda o ESLint no projeto                                        |
| `bun run format`    | Formata o código com Prettier                                   |

## Estrutura do projeto

- `src/routes/` — rotas (file-based routing do TanStack Start). Ver `src/routes/README.md` para as convenções de nomenclatura.
- `src/components/fanfarra/` — componentes específicos do app
- `src/components/ui/` — componentes de UI genéricos (shadcn/ui)
- `src/lib/fanfarra/` — lógica de negócio (auth, stores, Firestore, etc.)
- `firestore.rules` — regras de segurança do Firestore

## Notas

- O projeto usa Firebase Auth para login e Firestore como banco de dados.
- Rotas privadas exigem login — ver `AuthGuard` em `src/routes/__root.tsx`.
- Ainda não decidido: publicação como app nativo (Play Store/App Store), possivelmente via Capacitor.
