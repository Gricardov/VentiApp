# Venti — AI Event Discovery Platform 🎉

Plataforma de descubrimiento de eventos impulsada por IA. Conversa con Venti para encontrar eventos personalizados según tus intereses, modifica tu itinerario y inscríbete.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenRouter API Key ([get one here](https://openrouter.ai))

### 1. Configure Environment

```bash
# Backend: Set your OpenRouter API key
echo "OPENROUTER_API_KEY=your-key-here" >> backend/.env
```

### 2. Run with Docker

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000

### 3. Login

Use one of the demo accounts:

| Email | Password |
|-------|----------|
| `ana@example.com` | `password123` |
| `carlos@example.com` | `password123` |
| `maria@example.com` | `password123` |
| `diego@example.com` | `password123` |

---

## 🏗 Architecture

```
Venti/
├── docker-compose.yml
├── frontend/              # NextJS 16 + TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/     # Auth page
│   │   │   ├── chat/      # Main chat interface
│   │   │   └── globals.css # Dark theme design system
│   │   ├── components/
│   │   │   └── ItineraryCard.tsx
│   │   └── lib/
│   │       ├── api.ts     # Unified API client
│   │       └── env.ts     # Centralized env config
│   └── .env.local
├── backend/               # NestJS + LangGraph
│   ├── src/
│   │   ├── auth/          # JWT authentication
│   │   ├── conversation/  # LangGraph AI module
│   │   │   ├── graph/
│   │   │   │   ├── agent.graph.ts    # StateGraph
│   │   │   │   └── tools/
│   │   │   │       ├── suggest-events.tool.ts
│   │   │   │       └── enroll-user.tool.ts
│   │   │   ├── conversation.service.ts
│   │   │   └── conversation.controller.ts
│   │   ├── providers/     # JSON data providers
│   │   │   ├── user.provider.ts
│   │   │   ├── event.provider.ts
│   │   │   └── enrollment.provider.ts
│   │   └── common/types/  # Shared TypeScript types
│   ├── data/
│   │   ├── users.json     # 4 demo users
│   │   ├── events.json    # 18 events
│   │   └── enrollments.json
│   └── .env
└── README.md
```

## 📡 API Endpoints

### Auth
| Method | Endpoint | Body | Auth | Response |
|--------|----------|------|------|----------|
| POST | `/auth/login` | `{ email, password }` | ❌ | `{ access_token, user }` |

### Conversation
| Method | Endpoint | Body | Auth | Response |
|--------|----------|------|------|----------|
| POST | `/conversation` | `{ message }` | ✅ JWT | `{ text?, options? }` |
| DELETE | `/conversation/session` | — | ✅ JWT | `{ message }` |

### Response Schema

```typescript
interface LLMResponse {
  text?: string;       // Conversational text
  options?: OptionItem[];  // Event cards (when applicable)
}

interface OptionItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  matchPercentage: number;
  tags: string[];
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  enrolled: boolean;
  saved: boolean;
}
```

## 🧠 LangGraph Flow

The AI agent uses a **StateGraph** with these nodes:

1. **Router (Agent)** — LLM determines intent and calls tools
2. **suggest_events** — Matches events to user preferences (tag overlap + location + interests)
3. **enroll_user** — Confirms enrollment and persists to JSON
4. **Loop** — After tool execution, control returns to the agent for response formatting

### Tools

| Tool | Trigger | Action |
|------|---------|--------|
| `suggest_events` | "Sugiereme eventos", "Sorpréndeme" | Queries EventProvider, scores matches |
| `enroll_user` | "Inscríbeme", "Confirmo" | Writes to enrollments.json |

## 🎨 Features

- **Dark Theme** — Glassmorphism, smooth gradients, micro-animations
- **Itinerary Cards** — Photo, match %, tags, enroll/save buttons
- **"Sorpréndeme" Button** — One-click event discovery
- **Itinerary Modification** — "Elimina el segundo", "Agrega cocina"
- **Enrollment Flow** — Confirm and persist to JSON
- **Conversation Memory** — Per-user session with last 20 messages

## ⚙️ Environment Variables

### Backend (`.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `JWT_SECRET` | JWT signing key | `venti-secret` |
| `OPENROUTER_API_KEY` | OpenRouter API key | — |
| `OPENROUTER_MODEL` | LLM model | `google/gemini-2.0-flash-001` |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |

### Frontend (`.env.local`)
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend URL | `http://localhost:4000` |

## 🛠 Development (without Docker)

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend  
cd frontend && npm install && npm run dev
```
