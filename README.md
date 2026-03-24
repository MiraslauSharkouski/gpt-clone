# QwenChat Clone

A production-ready ChatGPT-like interface with Qwen-2.5 integration, vector RAG, real-time sync, and secure authentication.

## Features

- ✅ **Qwen-2.5 Chat** with streaming responses
- ✅ **Document RAG** (PDF/DOCX/TXT) - Upload documents for context-aware responses
- ✅ **Anonymous → Authenticated Flow** - 3 free messages, then email verification required
- ✅ **Cross-tab Sync** via Socket.IO
- ✅ **Image Support** - Upload and describe images via Qwen-VL
- ✅ **Responsive Design** - Mobile-first with dark/light mode
- ✅ **Secure** - Row Level Security, API key protection, file validation

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | Next.js 14 (App Router), React 18, TypeScript |
| UI         | ShadCN UI + Tailwind CSS + Framer Motion      |
| Backend    | Next.js API Routes (serverless)               |
| Database   | Supabase (PostgreSQL + pgvector)              |
| Auth       | Supabase Auth (email/password + anonymous)    |
| Realtime   | Socket.IO                                     |
| Storage    | Supabase Storage                              |
| AI         | Qwen-2.5 API (Alibaba DashScope)              |
| Embeddings | text-embedding-v3                             |
| Deployment | Vercel                                        |

## Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- Alibaba DashScope account (for Qwen API)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd gpt-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

- `QWEN_API_KEY` - Your Alibaba DashScope API key
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)

### 4. Set up Supabase database

Run the migrations:

```bash
npx supabase db push
```

Or manually run the SQL files in `supabase/migrations/` in your Supabase SQL editor.

### 5. Create Supabase Storage buckets

In your Supabase dashboard, go to Storage and create two buckets:

- `documents` - for uploaded PDF/DOCX/TXT files
- `images` - for uploaded images

Set both buckets to **Private**.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # Auth endpoints
│   │   ├── chats/          # Chat CRUD + messages
│   │   └── images/         # Image processing
│   ├── chat/[id]/          # Chat page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   ├── chat/               # Chat components
│   ├── sidebar/            # Sidebar components
│   └── ui/                 # ShadCN UI components
├── lib/
│   ├── qwen/               # Qwen API client
│   ├── rag/                # RAG pipeline
│   ├── socket/             # Socket.IO setup
│   ├── supabase/           # Supabase client
│   └── utils/              # Helpers
├── styles/                 # Global styles
└── types/                  # TypeScript types
```

## API Endpoints

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| POST   | `/api/auth/anonymous`     | Create anonymous session      |
| POST   | `/api/auth/upgrade`       | Upgrade to authenticated user |
| GET    | `/api/auth/check`         | Check auth status             |
| GET    | `/api/chats`              | List user's chats             |
| POST   | `/api/chats`              | Create new chat               |
| GET    | `/api/chats/:id`          | Get chat with messages        |
| PATCH  | `/api/chats/:id`          | Update chat metadata          |
| DELETE | `/api/chats/:id`          | Soft-delete chat              |
| POST   | `/api/chats/:id/messages` | Send message (SSE streaming)  |
| POST   | `/api/chats/:id/upload`   | Upload document               |
| POST   | `/api/chats/:id/context`  | Search RAG context            |
| POST   | `/api/images/describe`    | Describe image                |

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import project in Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables from `.env.example`
5. Deploy

### 3. Configure Supabase

In Supabase dashboard:

1. Go to Settings → API
2. Add your Vercel domain to allowed URLs
3. Update redirect URLs for auth

## Security Notes

- All AI calls are proxied through API routes (keys never exposed to client)
- Row Level Security (RLS) enforces user data isolation
- File uploads are validated for type and size (<10MB)
- Anonymous sessions expire after 24 hours
- Rate limiting: 3 messages per anonymous session

## Troubleshooting

### "QWEN_API_KEY is not configured"

Make sure your `.env.local` file has the correct API key from Alibaba DashScope.

### "Failed to upload file"

Check that:

1. Supabase Storage buckets (`documents`, `images`) exist
2. Bucket permissions allow uploads
3. File is under 10MB and correct type

### Database errors

Run migrations again:

```bash
npx supabase db push
```

### Streaming not working on mobile Safari

SSE should work, but ensure your server sends proper headers:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npx supabase db push  # Push database schema
```

## License

MIT

## Acknowledgments

- [Qwen](https://qwenlm.github.io/) - AI model by Alibaba
- [Supabase](https://supabase.com) - Backend as a service
- [ShadCN UI](https://ui.shadcn.com) - UI components
- [Next.js](https://nextjs.org) - React framework
