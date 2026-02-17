# DiscordLLMBot Dashboard

A modern React-based dashboard for managing and monitoring the DiscordLLMBot.

## Features

- **Dashboard**: Real-time analytics, activity metrics, and system health monitoring
- **Servers**: Manage bot configurations across multiple Discord servers
- **Playground**: Test bot responses and prompts in an isolated environment
- **Settings**: Configure bot persona, LLM provider, memory, and logging options
- **Logs**: Real-time log streaming with filtering and search capabilities

## Tech Stack

- **React 19** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Socket.IO Client** - Real-time log streaming
- **Axios** - HTTP client
- **Vite** - Build tool and dev server

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Running instance of DiscordLLMBot API

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Production files will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   └── common/         # Shared components (ErrorBoundary, LoadingState, etc.)
├── pages/              # Route-level page components
│   ├── Dashboard/      # Main dashboard with analytics
│   ├── Servers/        # Server management pages
│   ├── Settings/       # Bot configuration
│   ├── Playground/     # Bot testing interface
│   └── Logs/           # Real-time log viewer
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── utils/              # Utility functions
└── theme.js            # MUI theme configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Configuration

The dashboard uses environment variables for API configuration. Copy `.env.example` to `.env` and update as needed:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (dev proxy) | Base URL for the bot API |

### Development Proxy

The Vite dev server proxies API requests. Update `vite.config.js` or set `VITE_API_URL` to change the API target:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // Or use VITE_API_URL
      changeOrigin: true,
    },
  },
}
```

## API Endpoints

The dashboard expects the following API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Bot health status |
| `/api/analytics` | GET | Analytics data |
| `/api/replies` | GET | Recent bot replies |
| `/api/servers` | GET | List of servers |
| `/api/config` | GET/POST | Bot configuration |
| `/api/models` | GET | Available LLM models |
| `/api/chat` | POST | Send chat message |

## License

MIT
