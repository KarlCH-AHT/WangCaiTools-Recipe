import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { RecipeProvider, HomePage, RecipeDetailPage, CookingModePage } from "./features/recipes";
import { DailyMenuProvider, MenuOverviewPage, DailyMenuPage } from "./features/daily-menu";
import { WeeklyMenuProvider, WeeklyMenuPage } from "./features/weekly-menu";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AccountPage from "./pages/AccountPage";
import { ShareMenuPage } from "./features/sharing";
import ImmersiveCookingAssistant from "./pages/ImmersiveCookingAssistant";

/**
 * Design Philosophy: Modern Minimalism
 * - Clean, functional layout with left sidebar navigation
 * - Warm orange accent color (#EA580C) representing cooking heat
 * - Playfair Display for elegant headings, Inter for clear body text
 * - Minimal animations and subtle interactions
 */
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={HomePage} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/register"} component={RegisterPage} />
      <Route path={"/change-password"} component={ChangePasswordPage} />
      <Route path={"/account"} component={AccountPage} />
      <Route path={"/share/:id"} component={ShareMenuPage} />
      <Route path={"/recipe/:id"} component={RecipeDetailPage} />
      <Route path={"/cook/:id"} component={CookingModePage} />
      <Route path={"/menu"} component={MenuOverviewPage} />
      <Route path={"/today"} component={DailyMenuPage} />
      <Route path={"/weekly"} component={WeeklyMenuPage} />
      <Route path={"/immersive-cooking/:id"} component={ImmersiveCookingAssistant} />
      <Route path={"/immersive-cooking"} component={ImmersiveCookingAssistant} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <LanguageProvider>
          <RecipeProvider>
            <DailyMenuProvider>
              <WeeklyMenuProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </WeeklyMenuProvider>
            </DailyMenuProvider>
          </RecipeProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
