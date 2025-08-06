// This file forces React Query to be bundled by importing and using it
// Place this import in main.tsx to prevent tree-shaking

import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";

// Export these to ensure they stay in the bundle
export const forceReactQueryBundle = {
  useQuery,
  useMutation, 
  QueryClient,
  __bundled: true
};

// Add to window to guarantee bundling
if (typeof window !== 'undefined') {
  window.__REACT_QUERY_FORCE_BUNDLE__ = forceReactQueryBundle;
}