export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export const SCHEMA_TYPES = ["string", "number", "boolean", "object", "array", "null"] as const
export type SchemaType = (typeof SCHEMA_TYPES)[number]

/** One field of a request-body validation schema: name, expected type, and whether it must be present. */
export interface RequestSchemaField {
  name: string
  type: SchemaType | "any"
  required: boolean
}

/** One field in the response payload field-builder: name, type, and its raw (unparsed) value. */
export interface ResponseField {
  id: string
  name: string
  type: SchemaType
  value: string
}

export interface EndpointDef {
  id: string
  method: HttpMethod
  path: string
  statusCode: number
  requireAuth: boolean
  description: string
  response: unknown
  requestSchema?: RequestSchemaField[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface EndpointDraft {
  method: HttpMethod
  path: string
  statusCode: number
  requireAuth: boolean
  description: string
  response: unknown
}
