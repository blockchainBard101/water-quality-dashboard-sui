# Water Quality Dashboard

A production-grade frontend for visualizing and exporting water-quality readings stored on Sui blockchain.

## Features

- **Real-time KPI Cards**: Display latest temperature, dissolved oxygen, pH, and turbidity readings
- **Interactive Charts**: Line charts with metric toggles for trend analysis
- **Virtualized Data Table**: Handle thousands of rows efficiently with pagination
- **Data Export**: Download filtered datasets as CSV or JSON
- **Device-based Queries**: Filter data by device ID and time range
- **Minute-level Granularity**: Support for 0-1439 readings per day

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **TailwindCSS** + **shadcn/ui** components
- **recharts** for data visualization
- **@mysten/sui** SDK for blockchain integration
- **TanStack Query** for data fetching and caching
- **Papa Parse** for CSV export
- **Zod** for input validation

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Sui RPC access
- Water quality package ID

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd water-quality-dashboard
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your values:
   ```env
   NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
   NEXT_PUBLIC_PACKAGE_ID=0x...
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Querying Data

1. **Enter Device ID**: Input the device identifier you want to query
2. **Select Time Range**: Choose start and end dates (UTC)
3. **Quick Ranges**: Use preset buttons for common time ranges (24h, 7d, 30d)
4. **Click Query**: Fetch and display the data

### Viewing Data

- **KPI Cards**: Show latest readings for each metric
- **Charts**: Switch between temperature, dissolved oxygen, pH, and turbidity trends
- **Data Table**: Scroll through all readings with virtualized rendering
- **Load More**: Continue pagination for large datasets

### Exporting Data

- **CSV Export**: Download as comma-separated values with proper headers
- **JSON Export**: Download as structured JSON with metadata
- **Filtered Data**: Only exports currently displayed/queried data

## Data Model

The application works with water quality readings stored as Sui events:

```typescript
type Reading = {
  deviceId: string;           // Device identifier
  timestampMs: number;        // Unix timestamp in milliseconds
  dayUtc: number;            // UTC day (floor of timestampMs / 86_400_000)
  minuteIndex: number;       // Minute within day (0-1439)
  temperature: number;        // Temperature in °C (scaled from x100)
  dissolvedOxygen: number;    // Dissolved oxygen in mg/L (scaled from x100)
  ph: number;                // pH value (scaled from x100)
  turbidity: number;         // Turbidity in NTU (scaled from x100)
  by: string;                // Address that created the reading
}
```

## API Endpoints

### GET /api/readings
Query water quality readings with pagination.

**Query Parameters:**
- `deviceId` (required): Device identifier
- `fromMs` (required): Start timestamp in milliseconds
- `toMs` (required): End timestamp in milliseconds
- `limit` (optional): Maximum results per request (default: 5000)
- `cursor` (optional): Pagination cursor

**Response:**
```json
{
  "data": Reading[],
  "nextCursor": "string" // Present if more data available
}
```

### GET /api/latest
Get the most recent reading for a device.

**Query Parameters:**
- `deviceId` (required): Device identifier

**Response:**
```json
{
  "data": Reading
}
```

## Sui Integration

The application queries Sui blockchain for `MinuteReadingUpserted` events:

- **Event Type**: `${PACKAGE_ID}::per_minute::MinuteReadingUpserted`
- **Filtering**: Client-side filtering by device ID and timestamp range
- **Pagination**: Uses Sui's cursor-based pagination
- **Scaling**: Automatically converts x100 scaled values to decimals

## Performance Considerations

- **Virtualization**: Table uses `@tanstack/react-virtual` for large datasets
- **Caching**: TanStack Query caches API responses for 1 minute
- **Pagination**: Server limits to 5000 records per request
- **Debouncing**: Device ID input is debounced to prevent excessive queries

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
water-quality-dashboard/
├── app/
│   ├── (dashboard)/
│   │   └── page.tsx          # Main dashboard
│   ├── api/
│   │   ├── readings/
│   │   │   └── route.ts      # Readings API endpoint
│   │   └── latest/
│   │       └── route.ts      # Latest reading API endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (redirects to dashboard)
│   └── providers.tsx         # React Query provider
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── DeviceQueryBar.tsx    # Query form
│   ├── KpiCards.tsx          # KPI display
│   ├── ReadingChart.tsx      # Chart visualization
│   ├── ReadingTable.tsx      # Data table
│   └── ExportMenu.tsx        # Export functionality
├── lib/
│   ├── sui.ts               # Sui client configuration
│   ├── transform.ts         # Data transformation utilities
│   └── utils.ts             # General utilities
└── ...
```

## Troubleshooting

### Common Issues

1. **"No data available"**: Check device ID format and time range
2. **API errors**: Verify Sui RPC URL and package ID in environment variables
3. **Slow loading**: Large time ranges may take time; use pagination
4. **Export not working**: Ensure data is loaded before attempting export

### Environment Variables

Make sure these are properly set:
- `NEXT_PUBLIC_SUI_RPC_URL`: Valid Sui RPC endpoint
- `NEXT_PUBLIC_PACKAGE_ID`: Correct package ID for water quality module

## License

MIT License - see LICENSE file for details.
