import * as React from "react"

import { ApiError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { composeResponseFields, decomposeResponseObject } from "@/lib/response-fields"
import { HTTP_METHODS, type EndpointDef, type HttpMethod, type RequestSchemaField, type ResponseField } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestSchemaEditor } from "@/components/request-schema-editor"
import { ResponseFieldBuilder } from "@/components/response-field-builder"
const JsonEditor = React.lazy(() =>
  import("@/components/json-editor").then((m) => ({ default: m.JsonEditor }))
)

const DEFAULT_RESPONSE = JSON.stringify({ message: "hello world" }, null, 2)

type BodyMode = "json" | "fields"

interface EndpointFormProps {
  editing: EndpointDef | null
  onCancel: () => void
  onSaved: () => void
}

export function EndpointForm({ editing, onCancel, onSaved }: EndpointFormProps) {
  const { session } = useAuth()
  const [method, setMethod] = React.useState<HttpMethod>(editing?.method ?? "GET")
  const [path, setPath] = React.useState(editing?.path ?? "")
  const [statusCode, setStatusCode] = React.useState(String(editing?.statusCode ?? 200))
  const [description, setDescription] = React.useState(editing?.description ?? "")
  const [requireAuth, setRequireAuth] = React.useState(editing?.requireAuth ?? false)
  const [requestSchema, setRequestSchema] = React.useState<RequestSchemaField[]>(
    editing?.requestSchema ?? []
  )
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [bodyMode, setBodyMode] = React.useState<BodyMode>("json")
  const [bodyModeError, setBodyModeError] = React.useState<string | null>(null)
  const [responseText, setResponseText] = React.useState(
    editing ? JSON.stringify(editing.response, null, 2) : DEFAULT_RESPONSE
  )
  const [fields, setFields] = React.useState<ResponseField[]>(
    () => decomposeResponseObject(editing?.response) ?? []
  )

  const jsonError = React.useMemo(() => {
    try {
      JSON.parse(responseText)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid JSON"
    }
  }, [responseText])

  const fieldErrors = React.useMemo(() => composeResponseFields(fields).errors, [fields])
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const bodyInvalid = bodyMode === "json" ? !!jsonError : hasFieldErrors

  function switchToFields() {
    setBodyModeError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(responseText)
    } catch {
      setBodyModeError("Fix the JSON before switching to Fields.")
      return
    }
    const decomposed = decomposeResponseObject(parsed)
    if (!decomposed) {
      setBodyModeError("Fields mode only works for a JSON object response (not an array or plain value).")
      return
    }
    setFields(decomposed)
    setBodyMode("fields")
  }

  function switchToJson() {
    setBodyModeError(null)
    if (hasFieldErrors) {
      setBodyModeError("Fix the highlighted fields before switching to JSON.")
      return
    }
    const { value } = composeResponseFields(fields)
    setResponseText(JSON.stringify(value, null, 2))
    setBodyMode("json")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    let response: unknown
    if (bodyMode === "json") {
      if (jsonError) {
        setError("Response body must be valid JSON.")
        return
      }
      response = JSON.parse(responseText)
    } else {
      const composed = composeResponseFields(fields)
      if (Object.keys(composed.errors).length > 0) {
        setError("Fix the highlighted response fields before saving.")
        return
      }
      response = composed.value
    }

    const payload = {
      method,
      path: path.trim(),
      statusCode: Number(statusCode) || 200,
      requireAuth,
      description: description.trim(),
      response,
      requestSchema,
    }

    setSubmitting(true)
    try {
      if (editing) {
        await apiFetch(`/api/endpoints/${editing.id}`, {
          method: "PUT",
          body: payload,
          token: session?.token,
        })
      } else {
        await apiFetch("/api/endpoints", {
          method: "POST",
          body: payload,
          token: session?.token,
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? `Edit ${editing.method} ${editing.path}` : "Add a new endpoint"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                placeholder="/users/:id"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status code</Label>
              <Input
                id="status"
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="requireAuth"
              checked={requireAuth}
              onCheckedChange={(v) => setRequireAuth(v === true)}
            />
            <Label htmlFor="requireAuth" className="font-normal">
              Require Authorization: Bearer &lt;token&gt; to access this endpoint
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Response body</Label>
              <div className="flex items-center gap-2">
                <Tabs
                  value={bodyMode}
                  onValueChange={(v) => (v === "fields" ? switchToFields() : switchToJson())}
                >
                  <TabsList>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="fields">Fields</TabsTrigger>
                  </TabsList>
                </Tabs>
                {bodyMode === "json" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!!jsonError}
                    onClick={() => setResponseText(JSON.stringify(JSON.parse(responseText), null, 2))}
                  >
                    Format
                  </Button>
                )}
              </div>
            </div>

            {bodyModeError && <p className="text-xs text-destructive">{bodyModeError}</p>}

            {bodyMode === "json" ? (
              <>
                <React.Suspense
                  fallback={<div className="h-48 animate-pulse rounded-2xl bg-input/50" />}
                >
                  <JsonEditor
                    id="response"
                    value={responseText}
                    onChange={setResponseText}
                    invalid={!!jsonError}
                  />
                </React.Suspense>
                {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              </>
            ) : (
              <ResponseFieldBuilder fields={fields} onChange={setFields} />
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Request validation (optional)</p>
              <p className="text-xs text-muted-foreground">
                Define what an incoming request body must look like. Requests that don't match are
                rejected with a 400 before your response is returned.
              </p>
            </div>
            <RequestSchemaEditor fields={requestSchema} onChange={setRequestSchema} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || bodyInvalid}>
              {editing ? "Save changes" : "Create endpoint"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
