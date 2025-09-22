# FAQ Chatbox Frontend (Angular)

Modern, minimalist AI-powered FAQ chatbox using Retrieval-Augmented Generation (RAG) and Model Control Protocol (MCP) with Ocean Professional theme.

- Framework: Angular 19 (standalone components)
- Styling: Ocean Professional (blue & amber accents, gradients, rounded corners, smooth transitions)
- Layout: Header, sidebar topics, centered chatbox, footer. Responsive for mobile.
- Services: RAG orchestration and topic bridge. Mock ChromaDB and MCP integration.

## Quick Start

1) Install dependencies:
```bash
npm ci
```

2) Start dev server (port is configured to 3000 in angular.json):
```bash
npm start
# then open http://localhost:3000/
```

3) Build:
```bash
npm run build
```

4) Unit tests:
```bash
npm test
```

## Project Structure

- src/app/layout/header: Sticky header with gradient bar and actions
- src/app/layout/footer: Footer with auxiliary links
- src/app/topics/sidebar-topics.component.*: FAQ topics navigation
- src/app/chat/chatbox.component.*: Core chat UI
- src/app/core/rag.service.ts: Mock RAG + MCP pipeline with Chroma-like retrieval placeholder
- src/app/core/topics-bridge.service.ts: Broadcast selected topic across components
- src/app/utils/delay.ts: Simple async helper

## RAG + MCP Integration (Mock)

This frontend includes a mock pipeline in RagService:
- retrieveFromChroma(...) simulates retrieval; replace this with REST/GraphQL calls to your backend or Chroma server.
- selectMcpTool(...) picks a mock "tool" based on keywords; replace with real MCP tool negotiation.
- synthesizeAnswer(...) fakes a final answer.

To integrate with real services:
- Add environment variables in a .env file mapped to Angular environment config or use app config provider.
- Replace retrieveFromChroma with:
```ts
const res = await fetch(`${API_URL}/rag/retrieve?topic=${topic}&q=${encodeURIComponent(query)}`);
const docs = await res.json();
```
- Implement POST /chat/complete to call your LLM with retrieved docs and MCP tool context.

## Styling: Ocean Professional

- Primary: #2563EB
- Secondary/Success: #F59E0B
- Error: #EF4444
- Background: #f9fafb
- Surface: #ffffff
- Text: #111827

Features: subtle shadows, rounded corners (12–18px), gradients and transitions for depth.

## Notes on SSR

- SSR is configured using @angular/ssr. To serve SSR build:
```bash
npm run build
npm run serve:ssr:angular
```

## Environment variables

Do not commit secrets. For configuration create a .env.example indicating:
- API_URL: URL of backend API providing retrieval/generation endpoints
- SITE_URL: Base site URL (if needed for auth redirects)

These should be requested from the user and injected appropriately.

## Accessibility

- Color contrast is designed to meet WCAG AA where possible.
- Keyboard-friendly controls and clear focus states via input outlines.

## License

MIT (update as needed)
