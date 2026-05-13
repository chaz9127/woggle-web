# Woggle Web

## Project Overview
A monorepo web application consisting of a client-side React app built with Vite and a server-side Express API.

**Tech Stack:**
- **Client:** Vite + React
- **Server:** Express.js (Node.js)
- **Development:** Concurrently for running both services

## Folder Structure
```
woggle-web/
├── client/          # Vite React application
│   ├── src/         # React source code
│   ├── public/      # Static assets
│   └── package.json # Client dependencies
├── server/          # Express API server
│   ├── src/         # Server source code
│   │   └── app.js   # Main Express app
│   ├── .env.example # Environment variables template
│   └── package.json # Server dependencies
├── package.json     # Root package.json with workspaces
├── .gitignore       # Git ignore rules
└── CLAUDE.md        # This file
```

## Development Commands
- `npm run dev:client` - Start the Vite development server for the client
- `npm run dev:server` - Start the Express server with nodemon for the API
- `npm run dev` - Start both client and server concurrently

## Code Conventions
- **Naming:** Use camelCase for variables/functions, PascalCase for components
- **File Structure:** Follow standard React (components/, hooks/, utils/) and Express (routes/, middleware/, models/) patterns
- **Commits:** Use conventional commits (feat:, fix:, chore:, etc.)
- **API Routes:** All API endpoints must be prefixed with `/api/`

## Rules
- Never edit auto-generated files (e.g., Vite build outputs, node_modules)
- Always use conventional commit messages
- Keep API routes under the `/api/` prefix
- Maintain separation between client and server code