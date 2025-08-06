import { createRoot } from "react-dom/client";
// FORCE React Query imports at entry point to prevent tree-shaking
import { useQuery, useMutation, QueryClient } from "@/lib/queryClient";
import App from "./App";
import "./index.css";

// Force React Query to be included in bundle by referencing directly
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_FORCED__ = { useQuery, useMutation, QueryClient };
}

// Add global styles for dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
