import { blankField, composeResponseFields } from "@/lib/response-fields"
import { SCHEMA_TYPES, type ResponseField } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface ResponseFieldBuilderProps {
  fields: ResponseField[]
  onChange: (fields: ResponseField[]) => void
}

export function ResponseFieldBuilder({ fields, onChange }: ResponseFieldBuilderProps) {
  const { errors } = composeResponseFields(fields)

  function updateField(id: string, patch: Partial<ResponseField>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">No fields yet. Add one below.</p>
      )}

      {fields.map((f) => (
        <div key={f.id} className="space-y-1">
          <div className="flex items-start gap-2">
            <Input
              placeholder="fieldName"
              className="w-40 shrink-0 font-mono text-xs"
              value={f.name}
              onChange={(e) => updateField(f.id, { name: e.target.value })}
            />
            <Select
              value={f.type}
              onValueChange={(v) => updateField(f.id, { type: v as ResponseField["type"] })}
            >
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEMA_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="min-w-0 flex-1">
              {f.type === "string" && (
                <Input
                  placeholder="value"
                  value={f.value}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                />
              )}
              {f.type === "number" && (
                <Input
                  type="number"
                  placeholder="0"
                  value={f.value}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                />
              )}
              {f.type === "boolean" && (
                <Select
                  value={f.value || "true"}
                  onValueChange={(v) => updateField(f.id, { value: v ?? "true" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {f.type === "null" && (
                <Input disabled placeholder="null" value="" />
              )}
              {(f.type === "array" || f.type === "object") && (
                <Textarea
                  className="min-h-16 font-mono text-xs"
                  placeholder={f.type === "array" ? "[1, 2, 3]" : '{"a": 1}'}
                  value={f.value}
                  onChange={(e) => updateField(f.id, { value: e.target.value })}
                />
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeField(f.id)}
              aria-label={`Remove field ${f.name || ""}`}
            >
              Remove
            </Button>
          </div>
          {errors[f.id] && <p className="text-xs text-destructive">{errors[f.id]}</p>}
        </div>
      ))}

      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...fields, blankField()])}>
        Add field
      </Button>
    </div>
  )
}
