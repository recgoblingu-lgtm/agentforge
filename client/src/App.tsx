import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AgentWorkspace from "@/pages/AgentWorkspace";
import BackupPage from "@/pages/BackupPage";
import CodeLab from "@/pages/CodeLab";
import BrowserPage from "@/pages/BrowserPage";
import ToolsPage from "@/pages/ToolsPage";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRoutes() {
  return (
    <WouterRouter base={basePath}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agent/:id" component={AgentWorkspace} />
        <Route path="/backup" component={BackupPage} />
        <Route path="/code-lab" component={CodeLab} />
        <Route path="/browser" component={BrowserPage} />
        <Route path="/tools" component={ToolsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
