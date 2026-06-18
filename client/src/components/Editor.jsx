import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { createEditor, Transforms, Editor, Text } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'
import Toolbar from './Toolbar.jsx'

// Render each block element
const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'heading-one':
      return <h1 {...attributes} className="text-3xl font-bold text-gray-900 mb-3 mt-6 first:mt-0">{children}</h1>
    case 'heading-two':
      return <h2 {...attributes} className="text-2xl font-semibold text-gray-900 mb-2 mt-5 first:mt-0">{children}</h2>
    case 'heading-three':
      return <h3 {...attributes} className="text-xl font-semibold text-gray-800 mb-2 mt-4 first:mt-0">{children}</h3>
    case 'block-quote':
      return (
        <blockquote {...attributes} className="border-l-4 border-indigo-300 pl-4 my-3 text-gray-600 italic">
          {children}
        </blockquote>
      )
    case 'bulleted-list':
      return <li {...attributes} className="list-disc ml-6 my-0.5 text-gray-800">{children}</li>
    case 'numbered-list':
      return <li {...attributes} className="list-decimal ml-6 my-0.5 text-gray-800">{children}</li>
    default:
      return <p {...attributes} className="my-1 text-gray-800 leading-relaxed">{children}</p>
  }
}

// Render each text leaf (bold, italic, etc.)
const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold)          children = <strong>{children}</strong>
  if (leaf.italic)        children = <em>{children}</em>
  if (leaf.underline)     children = <u>{children}</u>
  if (leaf.strikethrough) children = <s>{children}</s>
  if (leaf.code)          children = (
    <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  )
  return <span {...attributes}>{children}</span>
}

const DEFAULT_VALUE = [{ type: 'paragraph', children: [{ text: '' }] }]

export default function SlateEditor({ docId, initialContent, onSave, readOnly = false }) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  const [value, setValue] = useState(initialContent || DEFAULT_VALUE)
  const saveTimer = useRef(null)

  // Debounced auto-save — fires 800ms after user stops typing
  const handleChange = useCallback((newValue) => {
    setValue(newValue)
    if (readOnly) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave?.(newValue)
    }, 800)
  }, [onSave, readOnly])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return
    switch (e.key) {
      case 'b': e.preventDefault(); toggleMark(editor, 'bold'); break
      case 'i': e.preventDefault(); toggleMark(editor, 'italic'); break
      case 'u': e.preventDefault(); toggleMark(editor, 'underline'); break
      case '`': e.preventDefault(); toggleMark(editor, 'code'); break
    }
  }, [editor])

  const renderElement = useCallback((props) => <Element {...props} />, [])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  return (
    <Slate editor={editor} initialValue={value} onChange={handleChange}>
      {!readOnly && <Toolbar />}
      <div className="px-16 py-10 max-w-3xl mx-auto min-h-[calc(100vh-200px)]">
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder="Start writing…"
          className="outline-none text-base text-gray-800 leading-relaxed min-h-96"
          spellCheck
          autoFocus
        />
      </div>
    </Slate>
  )
}

function toggleMark(editor, format) {
  const isActive = Editor.marks(editor)?.[format] === true
  if (isActive) Editor.removeMark(editor, format)
  else Editor.addMark(editor, format, true)
}
