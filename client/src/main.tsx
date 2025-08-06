import { createRoot } from "react-dom/client";
// ULTRA NUCLEAR: Import entire React Query at entry point
import * as TanstackQuery from "@tanstack/react-query";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// CRITICAL: Multiple forced references to prevent tree-shaking
const REACT_QUERY_REFS = {
  namespace: TanstackQuery,
  hooks: { useQuery, useMutation },
  client: QueryClient,
  provider: QueryClientProvider,
  // Force instantiation
  testClient: new QueryClient({ defaultOptions: { queries: { enabled: false } } }),
  // Force hook calls
  testHook: () => useQuery({ queryKey: ['__bundle_test__'], enabled: false })
};

// Triple window assignment for maximum bundling protection
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_ENTRY__ = REACT_QUERY_REFS;
  (window as any).__TANSTACK_ENTRY__ = TanstackQuery;
  Object.assign(window, { useQuery, useMutation, QueryClient, QueryClientProvider });
  
  // CRITICAL: Runtime backup for imports that might fail
  (window as any).ReactQueryBackup = {
    useQuery,
    useMutation,
    QueryClient,
    QueryClientProvider
  };
  
  // Log to force evaluation
  console.log('🚀 Entry point React Query forced:', Object.keys(REACT_QUERY_REFS));
  console.log('🔧 Runtime backup installed:', typeof (window as any).ReactQueryBackup.useQuery);
}

// Add global styles for dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
