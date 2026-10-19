# Software Supply Chain Risk Prediction — Frontend Platform

Enterprise web interface for visualizing software dependency graphs, monitoring package resolution caches, and exploring software supply chain risks.

## Technology Stack
- **Framework:** React 19 (JavaScript & JSX)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Graph Visualization:** React Flow (`@xyflow/react`)
- **Routing:** React Router DOM (v6+)
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios

## Modular Architecture

```text
frontend/
├── public/
├── src/
│   ├── app/                    # Application root & router definitions
│   │   ├── App.jsx
│   │   └── routes.jsx
│   ├── components/
│   │   ├── common/             # Badges, Buttons, Cards, Modals, Loading & Empty states
│   │   ├── layout/             # Sidebar, Navbar, DashboardLayout
│   │   └── dependency-graph/   # GraphCanvas, GraphControls, GraphLegend, GraphNode, NodeDetailsPanel
│   ├── pages/
│   │   ├── dashboard/          # Platform overview & metrics
│   │   ├── projects/           # Projects list & details with package manifests
│   │   ├── dependency-graph/   # Interactive directed dependency graph
│   │   └── cache-monitor/      # deps.dev shared cache monitor & statistics
│   ├── services/
│   │   ├── api.js              # Centralized Axios client
│   │   └── dependency-graph/   # graphService & graphTransformers
│   ├── hooks/
│   │   └── dependency-graph/   # useDependencyGraph & useGraphControls
│   ├── constants/              # Ecosystems, statuses, and routes
│   ├── utils/                  # Formatting and helpers
│   ├── styles/                 # Tailwind v4 theme & React Flow styles
│   └── main.jsx                # Application DOM entry point
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── README.md
```

## Getting Started

### 1. Configuration
Ensure the backend API base URL is configured in `.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
This generates an optimized static bundle in `frontend/dist/`.
