import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-7xl mb-2">🏰</div>
        <h1 className="font-display text-5xl font-bold text-magic">404</h1>
        <p className="mt-2 text-muted-foreground">Essa magia não existe por aqui.</p>
        <a href="/" className="inline-block mt-5 rounded-xl bg-gradient-magic text-white px-5 py-2.5 font-bold shadow-magic">Voltar ao início</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0A1045" },
      { title: "Genie Hacker — Aproveite mais. Espere menos." },
      { name: "description", content: "Companion inteligente para Walt Disney World: filas em tempo real, alertas de Lightning Lane no Telegram e roteiros otimizados." },
      { property: "og:title", content: "Genie Hacker — Aproveite mais. Espere menos." },
      { property: "og:description", content: "Companion inteligente para Walt Disney World: filas em tempo real, alertas de Lightning Lane no Telegram e roteiros otimizados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Genie Hacker — Aproveite mais. Espere menos." },
      { name: "twitter:description", content: "Companion inteligente para Walt Disney World: filas em tempo real, alertas de Lightning Lane no Telegram e roteiros otimizados." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/635ed148-d80e-4a3a-b4d0-cf68869849b0/id-preview-3a5cf308--71afac29-5bb1-4bba-9841-fed42fffaebe.lovable.app-1777500122021.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/635ed148-d80e-4a3a-b4d0-cf68869849b0/id-preview-3a5cf308--71afac29-5bb1-4bba-9841-fed42fffaebe.lovable.app-1777500122021.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
