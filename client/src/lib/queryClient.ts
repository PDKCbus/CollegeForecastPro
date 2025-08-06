// NUCLEAR option - directly import and immediately use to prevent tree-shaking
import {
  useQuery as reactQueryUseQuery,
  useMutation as reactQueryUseMutation,
  QueryClient as ReactQueryClient
} from "@tanstack/react-query";

// Force the bundler to include these by referencing them
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_BUNDLED__ = {
    useQuery: reactQueryUseQuery,
    useMutation: reactQueryUseMutation,
    QueryClient: ReactQueryClient
  };
}

// Export with different names to ensure they're not tree-shaken
export const useQuery = reactQueryUseQuery;
export const useMutation = reactQueryUseMutation;
export const QueryClient = ReactQueryClient;

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
  async ({ queryKey }) => {
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
