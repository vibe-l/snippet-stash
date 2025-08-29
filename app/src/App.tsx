import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import Index from "./routes/Index.tsx";
import NotFound from "./routes/NotFound.tsx";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Switch>
      <Route path="/" component={Index} />
      {/* All other routes will be caught by the NotFound component */}
      <Route component={NotFound} />
    </Switch>
  </TooltipProvider>
);

export default App;
