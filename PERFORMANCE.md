# Performance Analysis

## Benchmarking Methodology

### FPS Measurement

FPS is measured using `requestAnimationFrame` timestamps. Each frame's delta time is converted to FPS (1000/deltaMs). The monitor maintains a rolling window of 120 frames for averages and minimums.

- **Current FPS**: Most recent frame timing
- **Average FPS**: Mean of last 120 frames
- **Minimum FPS**: Lowest value in the 120-frame window

### Memory Measurement

Memory usage is reported via `performance.memory.usedJSHeapSize` when available (Chrome/Edge only). On browsers without this API, the display shows "Memory API unavailable" rather than fabricated values.

### Update Rate

Updates/sec is measured by counting stream ticks in the DataProvider's subscribe callback. The counter resets every second. For a 100ms interval, the expected value is approximately 10 updates/sec when the stream is running.

### Browser Benchmark

Browser benchmark not automatically measurable in the current development environment. Metrics are exposed in the application for manual browser benchmarking via the Live Stream page's Performance Benchmark section.

## React Optimization Techniques

### What is memoized and why

- **`useMemo`** for filtered/sorted/aggregated data derivations — prevents recomputation on every render
- **`useCallback`** for stable function references in Context — prevents child re-renders
- Stream data stored in `useRef` buffers, not React state — avoids re-rendering the entire tree on every 100ms tick

### High-frequency data path

The 100ms data stream does NOT update React state for each point:

```
High-frequency data (100ms interval)
  → useRef buffer (mutable, no re-render)
  → requestAnimationFrame callback
  → filterDataSync (synchronous, O(n))
  → setDisplayData / setDisplayFiltered (batched, once per frame)
  → Canvas reads from state (via render callback)
```

NOT:

```
High-frequency data
  → setState()
  → React re-render of entire component tree
  → 10,000+ DOM nodes
```

### Key architectural decisions

1. **Ref-based buffer**: `useRef<DataPoint[]>` stores the raw stream data. No React re-renders on each tick.
2. **RAF-batched updates**: Filtered data is computed and state is set inside `requestAnimationFrame`, limiting to one setState per frame.
3. **Synchronous filter**: For the 100ms tick, filtering is done synchronously (O(n) for 100K items is <1ms).
4. **Worker for user-triggered changes**: Web Worker is used when the user changes filters or aggregation level (not on every tick).

## Next.js Optimization

- **Server Components** for root layout
- **Client Components** only for interactive/browser-dependent code
- **Static generation** for page shells
- **App Router** for efficient code splitting

## Canvas Rendering Strategy

All high-volume visualizations use Canvas instead of SVG/DOM:

1. Single `<canvas>` element per chart
2. `devicePixelRatio` scaling for crisp rendering on HiDPI displays
3. `requestAnimationFrame` loop for continuous rendering per chart
4. `ResizeObserver` for responsive canvas sizing
5. Clipping regions for data bounds
6. Point decimation: renders at most one point per pixel width (e.g., 1000px chart with 100K points draws ~1000 points)

## requestAnimationFrame Strategy

Each Canvas chart component maintains its own `requestAnimationFrame` loop:

- Loop starts on mount
- Loop stops on unmount via `cancelAnimationFrame`
- No shared animation loops — each chart independently decides when to redraw
- Cleanup verified: all `rafRef.current` values are cancelled on unmount

## Web Worker Strategy

The Web Worker (`workers/dataProcessor.worker.ts`) handles CPU-intensive operations off the main thread:

- **Filtering**: Large dataset filtering with complex predicates
- **Aggregation**: Bucket computation across time windows
- **Statistics**: Percentile calculations on sorted arrays

Worker communication features:

- Request IDs for correlating responses
- 200ms timeout with synchronous fallback
- Error handling with fallback to sync computation
- Proper termination on unmount

The Worker is NOT used on every 100ms tick. It is used when:

- User changes filters (metric, boundary, status, time range, search)
- User changes aggregation level

For the 100ms stream tick, synchronous filtering is used (O(n) is <1ms even for 100K items).

## Virtualization Strategy

The data table uses custom virtualization (`hooks/useVirtualization.ts`):

- Fixed row height (36px)
- Scroll-based visible range calculation
- Overscan of 10 rows above/below viewport
- Absolute positioning for visible rows
- Total height spacer for correct scrollbar

This renders only ~30-50 DOM rows regardless of total dataset size (10K-100K).

## Ring Buffer

The stream buffer uses a bounded ring buffer:

- Maximum capacity: 120,000 data points
- When exceeded, oldest points are discarded via `slice()`
- Prevents unbounded memory growth during long-running sessions

## Client vs Server Responsibilities

**Server (static)**:
- Page shells and layout
- Metadata and SEO
- Loading skeletons
- Error boundaries

**Client (interactive)**:
- Canvas rendering
- Real-time data stream
- Web Workers
- Browser APIs (localStorage, performance.memory)
- Zoom/pan interactions
- Virtual scrolling

## Scaling Strategy

| Data Points | Target FPS | Strategy |
|-------------|-----------|----------|
| 10,000 | 60 | Full rendering, no decimation |
| 50,000 | 30+ | Point decimation, skip rendering |
| 100,000 | Usable | Aggressive decimation, aggregation |

Point decimation renders at most one point per pixel width. For 1000px wide charts with 100K points, only ~1000 points are actually drawn.

## Known Limitations

- Memory API (`performance.memory`) only available in Chromium browsers
- Web Worker overhead may not benefit datasets under 5,000 points
- Canvas tooltip positioning may drift on rapid mouse movement
- Touch interaction for zoom/pan is basic (no pinch-to-zoom)
- No offline support or service worker caching
- FPS measurement is affected by browser tab backgrounding (rAF pauses)
