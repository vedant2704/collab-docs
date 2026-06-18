/**
 * Shared rendering helpers used by both Editor.jsx (static) and CollabEditor.jsx (real-time).
 * Keeps the block/leaf rendering and keyboard shortcuts in one place.
 */
import { Editor } from 'slate'

// Block elements
export const Element = ({ attributes, children, element }) => {
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

// Text leaf marks
export const Leaf = ({ attributes, children, leaf }) => {
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

// Keyboard shortcuts
export const handleKeyDown = (e, editor) => {
  if (!e.ctrlKey && !e.metaKey) return
  switch (e.key) {
    case 'b': e.preventDefault(); toggleMark(editor, 'bold'); break
    case 'i': e.preventDefault(); toggleMark(editor, 'italic'); break
    case 'u': e.preventDefault(); toggleMark(editor, 'underline'); break
    case '`': e.preventDefault(); toggleMark(editor, 'code'); break
  }
}

const toggleMark = (editor, format) => {
  const isActive = Editor.marks(editor)?.[format] === true
  if (isActive) Editor.removeMark(editor, format)
  else Editor.addMark(editor, format, true)
}
