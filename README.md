# DevARC Academy 🚀

DevARC Academy — Aprenda IA aplicada à educação e produtividade.

## 🛠 Tech Stack
-   **Frontend**: React (Vite)
-   **Estilização**: TailwindCSS (Design System Customizado via `index.css`)
-   **Backend/DB**: Firebase (Firestore, Auth, Storage)
-   **Ícones**: Lucide React
-   **Build**: Vite

## 🚀 Como Rodar Localmente

1.  **Clone o repositório**
2.  **Instale as dependências**:
    ```bash
    npm install
    ```
3.  **Configuração do Firebase**:
    -   Crie um arquivo `.env` ou edite `src/lib/firebase.js` com suas credenciais.
4.  **Rodar o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```

## 📂 Estrutura do Projeto

```
src/
├── components/
│   ├── admin/          # Painel Administrativo (Gestão de Alunos, Conteúdo, Loja)
│   ├── auth/           # Login e Recuperação de Senha
│   ├── common/         # Componentes Reutilizáveis (Botões, Cards, Inputs)
│   ├── layout/         # Sidebar, Header, Layout Principal
│   ├── player/         # Player de Vídeo (YouTube/Vimeo) e Comentários
│   └── student/        # Área do Aluno (Dashboard, Vitrine, Comunidade)
├── context/            # Context API (Auth, Theme, Toast, Progress)
├── lib/                # Configurações (Firebase, Utils)
├── services/           # Serviços Externos (PDF, API)
└── App.jsx             # Roteamento e Lógica Principal
```

## 🧠 Lógica Principal (Para IAs e Devs)

### 1. Autenticação e Roles
-   O sistema verifica o campo `role` no documento do usuário no Firestore (`users/{uid}`).
-   `role: 'admin'`: Acesso total ao painel administrativo.
-   `role: 'student'`: Acesso apenas à área do aluno e cursos liberados.

### 2. Estrutura de Cursos (`structure`)
-   A estrutura é hierárquica e salva no Firestore (`structure` collection):
    -   **Turma** (Nível 1) -> **Trilha** (Nível 2) -> **Curso** (Nível 3) -> **Módulo** -> **Aula**.
-   O aluno só vê a Turma vinculada ao seu ID (`turmaId`).

### 3. Progresso e Certificados
-   O progresso é salvo individualmente em subcoleções: `users/{uid}/progress/{lessonId}`.
-   Ao completar 100% de um curso, o componente `StudentCertificates.jsx` libera o download do PDF.

## ✨ Funcionalidades "Premium"

### 🎥 Aulas ao Vivo
-   **Admin**: Cria salas e pode colar links externos (Zoom, Meet, YouTube).
-   **Aluno**: Vê apenas aulas ativas criadas nas últimas 24h.
-   **Código**: `AdminLiveClasses.jsx` / `StudentLiveClasses.jsx`.

### 🛍️ Loja / Vitrine
-   **Admin**: Cadastra produtos (Ebooks, Mentorias) com link de checkout externo.
-   **Aluno**: Visualiza em uma vitrine estilo e-commerce.
-   **Código**: `AdminProducts.jsx` / `StudentProducts.jsx`.

### 💬 Comunidade VIP
-   Feed estilo rede social para interação entre alunos.
-   Suporte a Posts, Likes e Comentários em tempo real.
-   **Código**: `StudentCommunity.jsx`.

## 🤖 Instruções para IA (Prompt System)
Se você é uma IA continuando este projeto:
1.  **Sempre** verifique `App.jsx` para entender as rotas.
2.  **Não** crie novos contextos se não for estritamente necessário; use `useToast` para feedback.
3.  **Mantenha** o padrão visual (Tailwind + Lucide).
4.  **Priorize** a performance (Lazy Loading já está implementado).

---
*Documentação gerada automaticamente para facilitar a continuidade e manutenção.*
