# Gemma

A modern AI chat interface with multi-model support, agent mode, and real-time streaming responses.

## Features

- **Multi-Model Selection** — Choose from a variety of AI models including Mistral Devstral, Tencent HY3, and GPT-OSS
- **Agent Mode** — Run queries across multiple models simultaneously and compare their responses side-by-side
- **Web Search** — Enable real-time web search for up-to-date answers
- **Streaming Responses** — See AI responses generate in real-time
- **Chat History** — Conversations stored in Convex for seamless persistence
- **Offline Support** — IndexedDB caching for offline access to recent chats
- **Code Highlighting** — Syntax-highlighted code blocks with copy functionality
- **Markdown Support** — Full GFM markdown rendering

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Lint
bun run lint
```

## Tech Stack

- **Frontend**: React 19, React Router 7, Tailwind CSS 4
- **Backend**: Convex
- **Auth**: Auth0
- **Icons**: Lucide React
- **Markdown**: react-markdown, remark-gfm
- **Code Highlighting**: react-syntax-highlighter
- **Build**: Vite 7

## Available Models

| Model | Tool Support |
|-------|-------------|
| Mistral: Devstral | Yes |
| Tencent HY3 | Yes |
| GPT-OSS 120B | No |

Enable Agent mode to query multiple models at once and compare their outputs.
