import { SCHEMA_TYPES, type RequestSchemaField } from "@/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TYPE_OPTIONS = ["any", ...SCHEMA_TYPES] as const

interface RequestSchemaEditorProps {
  fields: RequestSchemaField[]
  onChange: (fields: RequestSchemaField[]) => void
}

function blankSchemaField(): RequestSchemaField {
  return { name: "", type: "any", required: false }
}

export function RequestSchemaEditor({ fields, onChange }: RequestSchemaEditorProps) {
  function update(index: number, patch: Partial<RequestSchemaField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No validation rules. Any request body will be accepted.
        </p>
      )}

      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="fieldName"
            className="w-40 shrink-0 font-mono text-xs"
            value={f.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <Select value={f.type} onValueChange={(v) => update(i, { type: v as RequestSchemaField["type"] })}>
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`required-${i}`}
              checked={f.required}
              onCheckedChange={(v) => update(i, { required: v === true })}
            />
            <label htmlFor={`required-${i}`} className="text-sm text-muted-foreground">
              required
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto"
            onClick={() => remove(i)}
            aria-label={`Remove field ${f.name || ""}`}
          >
            Remove
          </Button>
        </div>
      ))}

      <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...fields, blankSchemaField()])}>
        Add field
      </Button>
    </div>
  )
}
