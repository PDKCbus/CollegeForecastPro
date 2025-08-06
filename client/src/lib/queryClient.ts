// ULTRA NUCLEAR option - force React Query inclusion AND fix runtime imports
import * as ReactQuery from "@tanstack/react-query";
import { 
  useQuery as origUseQuery, 
  useMutation as origUseMutation,
  QueryClient as origQueryClient,
  QueryClientProvider as origQueryClientProvider,
  type QueryFunction
} from "@tanstack/react-query";

// CRITICAL: Create runtime-safe exports
export const useQuery = origUseQuery;
export const useMutation = origUseMutation;
export const QueryClient = origQueryClient;
export const QueryClientProvider = origQueryClientProvider;

// CRITICAL: Force bundler to include React Query by multiple methods
const FORCE_INCLUDE = {
  // Method 1: Direct references
  useQuery: origUseQuery,
  useMutation: origUseMutation,
  QueryClient: origQueryClient,
  QueryClientProvider: origQueryClientProvider,
  // Method 2: Namespace import
  ReactQuery,
  // Method 3: Function calls to prevent tree-shaking
  testQuery: () => origUseQuery({ queryKey: ['test'], enabled: false }),
  testMutation: () => origUseMutation({ mutationFn: async () => {} }),
  testClient: () => new origQueryClient()
};

// Method 4: Global window references (multiple assignments for runtime access)
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_FORCED__ = FORCE_INCLUDE;
  (window as any).__TANSTACK_QUERY__ = ReactQuery;
  (window as any).__USE_QUERY__ = origUseQuery;
  (window as any).__USE_MUTATION__ = origUseMutation;
  (window as any).__QUERY_CLIENT__ = origQueryClient;
  (window as any).__QUERY_CLIENT_PROVIDER__ = origQueryClientProvider;
  
  // Additional runtime backup - make exports globally available
  (window as any).useQuery = origUseQuery;
  (window as any).useMutation = origUseMutation;
  (window as any).QueryClient = origQueryClient;
  (window as any).QueryClientProvider = origQueryClientProvider;
}

// Method 5: Force evaluation to prevent dead code elimination
console.log('🔥 React Query forced into bundle:', typeof origUseQuery, typeof origUseMutation);
console.log('🚀 Runtime exports verified:', typeof useQuery, typeof useMutation);

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }: { queryKey: any }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
