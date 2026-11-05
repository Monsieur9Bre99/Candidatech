import { createThemeToggle } from "./components/theme-toggle.js";
import { createThemeService } from "./services/theme-service.js";

createThemeToggle({ service: createThemeService() }).init();
