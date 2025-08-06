// ULTRA NUCLEAR option - force React Query inclusion
import * as ReactQuery from "@tanstack/react-query";
import { 
  useQuery, 
  useMutation,
  QueryClient,
  QueryClientProvider,
  type QueryFunction
} from "@tanstack/react-query";

// CRITICAL: Force bundler to include React Query by multiple methods
const FORCE_INCLUDE = {
  // Method 1: Direct references
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
  // Method 2: Namespace import
  ReactQuery,
  // Method 3: Function calls to prevent tree-shaking
  testQuery: () => useQuery({ queryKey: ['test'], enabled: false }),
  testMutation: () => useMutation({ mutationFn: async () => {} }),
  testClient: () => new QueryClient()
};

// Method 4: Global window references (multiple assignments)
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_FORCED__ = FORCE_INCLUDE;
  (window as any).__TANSTACK_QUERY__ = ReactQuery;
  (window as any).__USE_QUERY__ = useQuery;
  (window as any).__USE_MUTATION__ = useMutation;
  (window as any).__QUERY_CLIENT__ = QueryClient;
  (window as any).__QUERY_CLIENT_PROVIDER__ = QueryClientProvider;
}

// Method 5: Force evaluation to prevent dead code elimination
console.log('🔥 React Query forced into bundle:', typeof useQuery, typeof useMutation);

// Re-export for use throughout the app
export { useQuery, useMutation, QueryClient, QueryClientProvider };

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
