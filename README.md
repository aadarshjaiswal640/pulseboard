# Pulseboard

Performance-Critical Data Visualization Dashboard

## Overview

Pulseboard is a real-time data visualization dashboard built with Next.js App Router, TypeScript, and Canvas-based rendering. It processes and visualizes 10,000-100,000 data points while receiving new data at configurable intervals (50ms-1000ms).

## Features

- **Real-time Data Stream**: Configurable interval (50-1000ms) with start/pause/resume/stop/clear controls
- **Canvas-based Charts**: Line chart (with zoom/pan), bar chart, scatter plot, and heatmap — all built from scratch using HTML Canvas API, no chart libraries
- **Data Explorer**: Virtualized table rendering only visible rows for datasets up to 100K records, with search, filter, sort, and CSV export
- **Alert Rules**: Threshold-based alerts evaluated against actual incoming stream data, with localStorage persistence
- **Performance Monitor**: Real FPS (via rAF frame timing), average FPS, minimum FPS, updates/sec, processing time, and memory usage (Chrome/Edge)
- **Stress Test Mode**: Toggle between 1K, 5K, 10K, 50K, or 100K data points
- **Responsive Design**: Desktop, tablet, and mobile support with collapsible sidebar
- **Data Aggregation**: 1-minute, 5-minute, and 1-hour aggregation levels via Web Worker
- **Settings Persistence**: Stream interval, dataset size, aggregation, and performance monitor preferences saved to localStorage

## Architecture

```
app/
  layout.tsx          # Root layout (Server Component)
  globals.css         # Global styles
  page.tsx            # Redirects to /dashboard
  dashboard/
    layout.tsx        # Sidebar + DataProvider shell (Client Component)
    page.tsx          # Overview dashboard with 4 charts + stats
    live-stream/      # Real-time stream monitor with benchmark section
    data-explorer/    # Virtualized data browser with search/filter/sort
    alert-rules/      # Threshold alert rule configuration
    settings/         # Dashboard configuration with localStorage persistence
  api/data/           # API route for initial dataset generation

components/
  charts/             # Canvas-based chart components (LineChart, BarChart, ScatterPlot, Heatmap)
  controls/           # FilterPanel, TimeRangeSelector
  ui/                 # DataTable (virtualized), PerformanceMonitor
  providers/          # DataProvider (React Context)

hooks/                # Custom React hooks (useDataStream, useDataWorker, usePerformanceMonitor, useVirtualization)
lib/                  # Utilities, types, data generation, Canvas helpers
workers/              # Web Worker for filter/aggregation operations
```

## Setup

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Lint
npm run lint

# Production build
npm run build

# Start production server
npm start
```

## Routes

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview with 4 charts, stats, and virtualized event buffer |
| `/dashboard/live-stream` | Real-time stream monitor with performance benchmark section |
| `/dashboard/data-explorer` | Virtualized data browser with search, filter, sort, CSV export |
| `/dashboard/alert-rules` | Alert rule CRUD with live evaluation against stream data |
| `/dashboard/settings` | Dataset size, aggregation, interval, performance monitor toggle |

## Technology Stack

- **Next.js 16+** with App Router
- **TypeScript** (strict mode)
- **React 19** with Hooks + Context (no external state management)
- **HTML Canvas** for high-volume chart rendering (no chart libraries)
- **Web Workers** for CPU-heavy filter/aggregation operations
- **requestAnimationFrame** for smooth Canvas rendering loops

No external database, no Express server, no Vite, no chart libraries.

## Performance

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed performance analysis and architecture documentation.

## Deployment

Pulseboard is designed for deployment on Vercel with automatic GitHub integration.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete GitHub + Vercel deployment guide, including:
- Local verification steps
- GitHub repository setup
- Vercel deployment configuration
- Post-deployment verification
- Troubleshooting guide

**Requirements**: None
- No database
- No external API
- No environment variables
- No additional services
