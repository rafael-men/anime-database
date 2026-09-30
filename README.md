# Anime Database

Uma aplicação web full-stack, inspirada no [Letterboxd](https://letterboxd.com), para acompanhar, avaliar e organizar animes. Os usuários podem navegar pelos animes da [API AniList](https://anilist.gitbook.io/anilist-apiv2-docs/overview/graphql/getting-started), criar listas de acompanhamento, escrever avaliações, criar listas personalizadas, seguir outros usuários e gerenciar seus perfis. 

## Funcionalidades

### Autenticação e Segurança

- Sessões no servidor via **Redis**, com cookies seguros e `httpOnly`.
- Proteção **CSRF** em requisições que alteram dados.
- Rate limiting global e por rota para login, cadastro e verificações de disponibilidade.
- Headers de segurança com **Helmet** e CORS restrito às origens configuradas.
- Validação de entrada com `class-validator` e `ValidationPipe` do NestJS.
- Hash de senhas com **bcrypt**.
- Verificação da disponibilidade de nome de usuário e email durante o cadastro.
- Restrições finais de unicidade no banco de dados.
- Endpoint `/health` para verificações de disponibilidade e deploy.

### Catálogo de Animes

- Busca e navegação pela API GraphQL da AniList.
- Filtros por gênero, formato, ano, status, ordenação, conteúdo adulto e exclusões NSFW.
- Sugestões de busca com debounce e cancelamento de requisições antigas.
- Páginas detalhadas de animes com sinopse, personagens, estatísticas e status.
- Páginas de detalhes de personagens com contagem de kins.
- Cache, compartilhamento de requisições duplicadas, limite de concorrência e retry controlado para erros `429`.
- Skeleton loading para grids e páginas de detalhes.

### Perfil e Social

- Perfis públicos com nome de usuário, biografia e avatar.
- Sistema de seguir/deixar de seguir, com contagens e listas.
- Visualização de perfis por ID.
- Edição de perfil com intervalo mínimo para alteração do nome.
- Feedback de disponibilidade de username durante a edição e o cadastro.

### Favoritos e Lista de Acompanhamento

- Adição de animes aos favoritos com status: assistindo, concluído, em espera, abandonado e planejado.
- Remoção de animes dos favoritos.
- Lista de acompanhamento por usuário com gerenciamento de status.

### Avaliações e Notas

- Avaliação de animes em uma escala de 0 a 10.
- Comentários opcionais e marcação de spoilers.
- Visualização das avaliações de um anime.
- Registro de reassistidas.

### Grupos e Listas Personalizadas

- Criação, edição e exclusão de grupos.
- Adição e remoção de animes com ordenação e observações.
- Visibilidade pública ou privada.

### Tradução

- Tradução opcional de descrições do inglês para o português.
- Cache em memória e `localStorage`, indexado pelo texto e idioma.
- Fallback para o texto original em caso de erro, CORS, `429` ou texto muito grande.

### Upload de Avatar

- Upload de imagens JPEG, PNG, GIF e WebP.
- Validação por magic bytes para confirmar o conteúdo real do arquivo.
- Limite de 2 MB e um arquivo por upload.
- Armazenamento local ou AWS S3 compatível, com URLs públicas ou pré-assinadas.

### Painel Administrativo

- Rota `/control` protegida por Basic Auth.
- Visualização de solicitações de acesso a certos conteudos.
- Aprovação ou recusa das solicitações por usuário.

### Experiência do Frontend

- Angular SSR com layouts responsivos para desktop e mobile.
- Cards de anime com dimensões uniformes em grids e carrosséis.
- Telas de login e cadastro com o asset público `logo.jpg`.
- Skeleton loading e estados de vazio/erro nas telas de recursos.

## Stack Tecnológica

| Camada | Tecnologia |
| ------ | ---------- |
| Cliente | Angular 21, TypeScript 5.9, Vitest, Tailwind CSS 4 e Angular SSR |
| Servidor | NestJS 11, TypeScript 5.7, Jest e class-validator |
| Banco de dados | MySQL via TypeORM e mysql2 |
| Sessões | Redis via ioredis |
| Armazenamento | Sistema local ou storage compatível com AWS S3 |
| Dados externos | API GraphQL da AniList |

## Estrutura do Projeto

```text
anime-database/
├── .github/workflows/                # Workflow de CI/CD
├── client/                           # Frontend Angular
│   └── src/app/
│       ├── components/               # Páginas e componentes da interface
│       ├── guards/                   # Guards de rota
│       ├── api/                      # Rotas, serviços e interceptors HTTP
│       └── server.ts                 # Servidor SSR do cliente
├── server/                           # Backend NestJS
│   └── src/
│       ├── application/              # Auth, controllers e sessões
│       ├── data/                     # Configuração de banco e migrações
│       ├── domain/                   # Modelos TypeORM
│       ├── storage/                  # Provedores local/S3
│       ├── use-cases/                # Regras de negócio
│       └── utils/                    # Segurança e upload
├── LICENSE
└── README.md
```

## Primeiros Passos

### Pré-requisitos

- **Node.js** >= 20
- **npm** >= 10
- **MySQL** 8.x ou compatível
- **Redis** 7.x

### 1. Clonar o repositório

```bash
git clone <repository-url>
cd anime-database
```

### 2. Configurar o servidor

```bash
cd server
npm install
```

Crie um arquivo `.env` no diretório `server/`:

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_NAME=animelog
DB_SYNC=true

# Redis
REDIS_URL=redis://localhost:6379

# Sessão
SESSION_SECRET=a-strong-random-secret

# Frontend
FRONTEND_URL=http://localhost:4200

# Credenciais administrativas. Use HTTPS em produção.
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme

# Armazenamento
STORAGE_DRIVER=local
UPLOADS_DIR=./uploads

# Rate limiting. Padrão: 100 requisições por minuto.
RATE_LIMIT=100

# Porta. Padrão: 3000.
PORT=3000
```

Inicie o servidor:

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O servidor inicia por padrão em <http://localhost:3000>.

### 3. Configurar o cliente

```bash
cd client
npm install
npm start
```

O cliente inicia em <http://localhost:4200> e encaminha as chamadas para o backend.

Para builds SSR de produção, defina `API_BASE_URL` e, quando necessário, `CSP_CONNECT_SRC` antes de executar `npm run build` em `client/`.

### Storage S3 (opcional)

Para usar S3 ou um serviço compatível nos avatares, adicione ao `.env` do servidor:

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Opcionais
S3_ENDPOINT=https://your-s3-endpoint.com
S3_PUBLIC_URL=https://cdn.example.com
S3_FORCE_PATH_STYLE=true
S3_ACL=public-read
S3_URL_TTL_SECONDS=3600
```

Quando `S3_PUBLIC_URL` é definido, as URLs retornadas usam esse endereço. Caso contrário, URLs pré-assinadas são geradas por requisição.

## Testes

### Servidor

```bash
cd server
npm test
npm run test:cov
npm run test:e2e
```

### Cliente

```bash
cd client
npx ng test --watch=false --no-progress
```

Comandos equivalentes aos executados no CI:

```bash
cd server && npm run test:ci && npm run build
cd ../client && npm run test:ci && npm run build
```

## Referência da API

A maioria dos endpoints exige um cookie de sessão ativo. As rotas de autenticação, verificações de disponibilidade e `/health` são públicas. Requisições que alteram dados exigem um header `X-CSRF-Token` válido.

### Autenticação

| Método | Endpoint | Descrição | Limite |
| ------ | -------- | --------- | ------ |
| POST | `/auth/register` | Criar uma conta | 10/min |
| POST | `/auth/login` | Entrar | 5/min |
| GET | `/auth/check-username?username=...` | Verificar disponibilidade do nome | 30/min |
| GET | `/auth/check-email?email=...` | Verificar disponibilidade do email | 30/min |
| GET | `/auth/session` | Obter sessão atual | - |
| POST | `/auth/logout` | Encerrar sessão | - |

### Usuários

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET | `/users/:id` | Obter perfil pelo ID |
| GET | `/users/:id/check-username` | Verificar disponibilidade do nome |
| POST | `/users/:id/profile` | Atualizar perfil |
| POST | `/users/:id/avatar` | Enviar imagem de avatar |
| POST | `/users/:id/favorites` | Adicionar anime aos favoritos |
| DELETE | `/users/:id/favorites/:animeId` | Remover anime dos favoritos |
| GET | `/users/:id/favorites` | Listar favoritos |
| POST | `/users/:id/reviews` | Criar avaliação |
| GET | `/users/:id/reviews` | Listar avaliações |
| GET | `/users/kin-count/:characterId` | Obter contagem de kins |

### Seguidores

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| POST | `/follows/:id` | Seguir usuário |
| DELETE | `/follows/:id` | Deixar de seguir usuário |
| GET | `/follows/:id/check` | Verificar se segue |
| GET | `/follows/:id/counts` | Obter contagens |
| GET | `/follows/:id/followers` | Listar seguidores |
| GET | `/follows/:id/following` | Listar usuários seguidos |

### Avaliações

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET | `/reviews/anime/:animeId` | Obter avaliações do anime |

### Grupos

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| POST | `/groups` | Criar grupo |
| GET | `/groups/owner/:ownerId` | Listar grupos do proprietário |
| GET | `/groups/:id` | Obter grupo pelo ID |
| PATCH | `/groups/:id` | Atualizar grupo |
| DELETE | `/groups/:id` | Excluir grupo |
| POST | `/groups/:id/items` | Adicionar anime ao grupo |
| DELETE | `/groups/:id/items/:animeId` | Remover anime do grupo |

### Lista de Acompanhamento

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| POST | `/watchlist/:userId` | Adicionar anime à lista |
| GET | `/watchlist/:userId` | Obter lista do usuário |
| PATCH | `/watchlist/:userId/:animeId` | Atualizar status |
| DELETE | `/watchlist/:userId/:animeId` | Remover da lista |

### Administração

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET | `/control/users` | Listar solicitações adultas pendentes |
| POST | `/control/users/:id/approve` | Aprovar acesso a conteúdo adulto |
| POST | `/control/users/:id/deny` | Recusar acesso a conteúdo adulto |

### Saúde da aplicação

| Método | Endpoint | Descrição |
| ------ | -------- | --------- |
| GET | `/health` | Resposta de disponibilidade para verificações de deploy |

