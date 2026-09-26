import type { ResponseField, SchemaType } from "@/types"

let counter = 0
export function newFieldId() {
  counter += 1
  return `field_${Date.now()}_${counter}`
}

export function blankField(): ResponseField {
  return { id: newFieldId(), name: "", type: "string", value: "" }
}

interface ComposeResult {
  value: Record<string, unknown>
  errors: Record<string, string>
}

/** Turns field-builder rows into the actual JSON object that will be saved as the response. */
export function composeResponseFields(fields: ResponseField[]): ComposeResult {
  const value: Record<string, unknown> = {}
  const errors: Record<string, string> = {}
  const seenNames = new Set<string>()

  for (const f of fields) {
    const name = f.name.trim()
    if (!name) {
      errors[f.id] = "Field name is required"
      continue
    }
    if (seenNames.has(name)) {
      errors[f.id] = `Duplicate field name "${name}"`
      continue
    }
    seenNames.add(name)

    switch (f.type) {
      case "string":
        value[name] = f.value
        break
      case "number": {
        const n = Number(f.value)
        if (f.value.trim() === "" || Number.isNaN(n)) {
          errors[f.id] = "Enter a valid number"
        } else {
          value[name] = n
        }
        break
      }
      case "boolean":
        value[name] = f.value === "true"
        break
      case "null":
        value[name] = null
        break
      case "array":
      case "object": {
        const raw = f.value.trim() || (f.type === "array" ? "[]" : "{}")
        try {
          const parsed: unknown = JSON.parse(raw)
          const isArray = Array.isArray(parsed)
          if (f.type === "array" && !isArray) {
            errors[f.id] = "Must be a JSON array, e.g. [1, 2, 3]"
          } else if (f.type === "object" && (isArray || typeof parsed !== "object" || parsed === null)) {
            errors[f.id] = 'Must be a JSON object, e.g. {"a": 1}'
          } else {
            value[name] = parsed
          }
        } catch {
          errors[f.id] = `Invalid JSON ${f.type}`
        }
        break
      }
    }
  }

  return { value, errors }
}

/** Reverses composeResponseFields: splits a plain JSON object back into editable rows. Returns null if value isn't a plain object (e.g. an array or scalar), since the builder only edits top-level object fields. */
export function decomposeResponseObject(value: unknown): ResponseField[] | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null

  return Object.entries(value as Record<string, unknown>).map(([name, v]) => {
    const id = newFieldId()
    if (v === null) return { id, name, type: "null" as SchemaType, value: "" }
    if (typeof v === "string") return { id, name, type: "string" as SchemaType, value: v }
    if (typeof v === "number") return { id, name, type: "number" as SchemaType, value: String(v) }
    if (typeof v === "boolean") return { id, name, type: "boolean" as SchemaType, value: String(v) }
    if (Array.isArray(v)) return { id, name, type: "array" as SchemaType, value: JSON.stringify(v, null, 2) }
    return { id, name, type: "object" as SchemaType, value: JSON.stringify(v, null, 2) }
  })
}
