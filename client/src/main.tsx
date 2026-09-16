import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();
const backendOrigin = import.meta.env.VITE_API_ORIGIN || (window.location.hostname.endsWith("github.io") ? "https://3000-ikrk0jarfigos43xpc3qw-901a0367.us4.manus.computer" : "");
const trpcClient = trpc.createClient({ links: [httpBatchLink({ url: `${backendOrigin}/api/trpc`, transformer: superjson, fetch(input, init) { return globalThis.fetch(input, { ...(init ?? {}), credentials: "omit" }); } })] });

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </trpc.Provider>
);
