import * as React from "react"

import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { EndpointDef } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EndpointForm } from "@/components/endpoint-form"
import { EndpointTable } from "@/components/endpoint-table"

export function Dashboard() {
  const { session, logout } = useAuth()
  const [endpoints, setEndpoints] = React.useState<EndpointDef[]>([])
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<EndpointDef | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const data = await apiFetch<EndpointDef[]>("/api/endpoints", { token: session?.token })
      setEndpoints(data)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load endpoints.")
    }
  }, [session])

  React.useEffect(() => {
    let ignore = false
    apiFetch<EndpointDef[]>("/api/endpoints", { token: session?.token })
      .then((data) => {
        if (!ignore) {
          setEndpoints(data)
          setLoadError(null)
        }
      })
      .catch((err) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : "Failed to load endpoints.")
      })
    return () => {
      ignore = true
    }
  }, [session?.token])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mock API Builder</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Logged in as {session?.username}</span>
          <Button size="sm" variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your JWT</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm text-muted-foreground">
            Send this as an <code>Authorization: Bearer &lt;token&gt;</code> header when calling
            endpoints marked "auth required".
          </p>
          <div className="max-h-16 overflow-y-auto rounded-md border bg-muted/30 p-2 font-mono text-xs break-all text-muted-foreground">
            {session?.token}
          </div>
        </CardContent>
      </Card>

      <EndpointForm
        key={editing?.id ?? "new"}
        editing={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          refresh()
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <EndpointTable endpoints={endpoints} onEdit={setEditing} onDeleted={refresh} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
