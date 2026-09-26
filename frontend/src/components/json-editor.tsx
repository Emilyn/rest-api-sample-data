import CodeMirror from "@uiw/react-codemirror"
import { githubDark, githubLight } from "@uiw/codemirror-theme-github"
import { json, jsonParseLinter } from "@codemirror/lang-json"
import { lintGutter, linter } from "@codemirror/lint"

import { cn } from "@/lib/utils"
import { useIsDark } from "@/lib/use-is-dark"

interface JsonEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  height?: string
}

const extensions = [json(), linter(jsonParseLinter()), lintGutter()]

export function JsonEditor({ id, value, onChange, invalid, height = "12rem" }: JsonEditorProps) {
  const isDark = useIsDark()

  return (
    <div
      id={id}
      className={cn(
        "overflow-hidden rounded-2xl border border-transparent bg-input/50 text-sm",
        invalid && "border-destructive ring-3 ring-destructive/20"
      )}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        height={height}
        theme={isDark ? githubDark : githubLight}
        extensions={extensions}
        basicSetup={{ foldGutter: false }}
      />
    </div>
  )
}
