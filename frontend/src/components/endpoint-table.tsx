import * as React from "react"

import { API_BASE, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { EndpointDef } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface EndpointTableProps {
  endpoints: EndpointDef[]
  onEdit: (endpoint: EndpointDef) => void
  onDeleted: () => void
}

interface TryResult {
  status: number
  body: string
}

export function EndpointTable({ endpoints, onEdit, onDeleted }: EndpointTableProps) {
  const { session } = useAuth()
  const [tryingId, setTryingId] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<TryResult | null>(null)

  async function handleTry(ep: EndpointDef) {
    setTryingId(ep.id)
    setResult(null)
    const testPath = ep.path.replace(/:[^/]+/g, "test")
    try {
      const headers: Record<string, string> = {}
      if (ep.requireAuth && session?.token) headers.Authorization = `Bearer ${session.token}`
      const res = await fetch(`${API_BASE}${testPath}`, { method: ep.method, headers })
      const text = await res.text()
      let display = text
      try {
        display = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // leave as raw text
      }
      setResult({ status: res.status, body: display })
    } catch (err) {
      setResult({ status: 0, body: err instanceof Error ? err.message : "Request failed" })
    }
  }

  async function handleDelete(ep: EndpointDef) {
    if (!confirm(`Delete ${ep.method} ${ep.path}?`)) return
    await apiFetch(`/api/endpoints/${ep.id}`, { method: "DELETE", token: session?.token })
    if (tryingId === ep.id) {
      setTryingId(null)
      setResult(null)
    }
    onDeleted()
  }

  if (endpoints.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No endpoints yet. Add one above.</p>
  }

  const sorted = [...endpoints].sort((a, b) => a.path.localeCompare(b.path))
  const active = sorted.find((e) => e.id === tryingId)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Method</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Auth</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((ep) => (
            <TableRow key={ep.id}>
              <TableCell>
                <Badge variant="secondary">{ep.method}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{ep.path}</TableCell>
              <TableCell>{ep.statusCode}</TableCell>
              <TableCell>
                <Badge variant={ep.requireAuth ? "default" : "outline"}>
                  {ep.requireAuth ? "required" : "public"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{ep.description}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleTry(ep)}>
                    Try
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onEdit(ep)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(ep)}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {active && result && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <p className="font-mono text-xs text-muted-foreground">
            curl -X {active.method} '{API_BASE}
            {active.path.replace(/:[^/]+/g, "test")}'
            {active.requireAuth ? ` -H 'Authorization: Bearer ${session?.token}'` : ""}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs">
            {`HTTP ${result.status}\n\n${result.body}`}
          </pre>
        </div>
      )}
    </div>
  )
}
