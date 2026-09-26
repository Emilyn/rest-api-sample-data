import { AuthScreen } from "@/components/auth-screen"
import { Dashboard } from "@/components/dashboard"
import { useAuth } from "@/lib/auth-context"

export function App() {
  const { session } = useAuth()
  return session ? <Dashboard /> : <AuthScreen />
}

export default App
