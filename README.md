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

## 🧩 Arquitectura de Software

El proyecto usa una **Layered Architecture** (arquitectura en capas) con el patrón **Provider** para acceso a datos:

```
┌──────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (NextJS)                  │
│  Login Page → Chat Page → ItineraryCard Components       │
│  lib/env.ts (config) → lib/api.ts (HTTP client unificado)│
└───────────────────────┬──────────────────────────────────┘
                        │ REST (JWT Bearer)
┌───────────────────────▼──────────────────────────────────┐
│                    CONTROLADORES (NestJS)                 │
│  AuthController (/auth/login)                            │
│  ConversationController (/conversation) ← JwtAuthGuard   │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│                    SERVICIOS (Business Logic)             │
│  ConversationService (session management, context inject) │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│              ORQUESTACIÓN IA (LangGraph StateGraph)       │
│  Agent Node → [suggest_events | enroll_user] → Agent     │
│                      ↕ OpenRouter API                    │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│                 PROVIDERS (Data Access Layer)             │
│  UserProvider (users.json)                               │
│  EventProvider (events.json) ← match scoring algorithm   │
│  EnrollmentProvider (enrollments.json) ← write/read      │
└──────────────────────────────────────────────────────────┘
```

### Patrones de Diseño

| Patrón | Dónde | Propósito |
|--------|-------|-----------|
| **Layered Architecture** | Controller → Service → Provider | Separación de responsabilidades por capa |
| **Provider Pattern** | `UserProvider`, `EventProvider`, `EnrollmentProvider` | Acceso a datos JSON sin DB, fácilmente reemplazable |
| **Guard Pattern** | `JwtAuthGuard` en rutas protegidas | Autenticación declarativa por decorador |
| **Tool-based Agent** | LangGraph con tools dinámicos | El LLM decide qué herramientas usar según intención |
| **Session-per-user** | `ConversationService` con Map en memoria | Historial de conversación por usuario |
| **Unified API Client** | `lib/api.ts` centraliza fetch + auth | Punto único de acceso al backend |
| **Response Schema** | `LLMResponse { text?, options? }` | Contrato estandarizado entre backend y frontend |
| **Global Module** | `ProvidersModule` con `@Global()` | Inyección de dependencias disponible en toda la app |

### Diagrama de Flujo (Mermaid)

```mermaid
graph TB
    subgraph Frontend
        A[Login Page] -->|JWT| B[Chat Page]
        B --> C[ItineraryCard]
        B --> D[lib/api.ts]
    end

    subgraph Backend
        E[AuthController] -->|validate| F[UserProvider]
        G[ConversationController] -->|userId + prefs| H[ConversationService]
        H --> I[LangGraph Agent]
    end

    subgraph LangGraph
        I --> J{Router LLM}
        J -->|suggest| K[suggest_events Tool]
        J -->|enroll| L[enroll_user Tool]
        K --> M[EventProvider]
        L --> N[EnrollmentProvider]
        J -->|API call| O[OpenRouter]
    end

    D -->|POST /auth/login| E
    D -->|POST /conversation| G
```

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend
    participant LG as LangGraph
    participant OR as OpenRouter
    participant EP as EventProvider

    User->>FE: Login (email/password)
    FE->>BE: POST /auth/login
    BE-->>FE: JWT Token

    User->>FE: "Eventos de arte en Lima"
    FE->>BE: POST /conversation (JWT)
    BE->>BE: Extract userId → load preferences
    BE->>LG: message + userPreferences
    LG->>OR: Chat completion con tools
    OR-->>LG: tool_call suggest_events
    LG->>EP: matchEvents(prefs, intent)
    EP-->>LG: eventos rankeados
    LG->>OR: tool result
    OR-->>LG: JSON formateado
    LG-->>BE: LLMResponse
    BE-->>FE: {text, options[]}
    FE->>User: Texto + Itinerary Cards
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
