import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { DirectionProvider } from "@/components/ui/direction"
import { AuthProvider } from "@/lib/auth-context"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider direction="ltr">
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </DirectionProvider>
  </StrictMode>
)
