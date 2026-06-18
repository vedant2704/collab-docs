import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'
import * as Y from 'yjs'
import Toolbar from './Toolbar.jsx'
import { Element, Leaf, handleKeyDown } from './EditorHelpers.jsx'

const DEFAULT_VALUE = [{ type: 'paragraph', children: [{ text: '' }] }]

export default function CollabEditor({ ydoc, provider, readOnly = false }) {
  const [value, setValue] = useState(DEFAULT_VALUE)
  const isRemote = useRef(false)
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  const yContent = useMemo(() => {
    if (!ydoc) return null
    return ydoc.getArray('content')
  }, [ydoc])

  useEffect(() => {
    if (!yContent) return
    const observer = () => {
      const remoteValue = yContent.toArray()
      if (remoteValue.length > 0) {
        isRemote.current = true
        try {
          editor.children = remoteValue
          editor.onChange()
          setValue(remoteValue)
        } catch (e) {}
        isRemote.current = false
      }
    }
    yContent.observe(observer)
    return () => yContent.unobserve(observer)
  }, [yContent, editor])

  const handleChange = useCallback((newValue) => {
    setValue(newValue)
    if (!isRemote.current && yContent) {
      ydoc.transact(() => {
        yContent.delete(0, yContent.length)
        yContent.insert(0, newValue)
      })
    }
  }, [yContent, ydoc])

  const renderElement = useCallback((props) => <Element {...props} />, [])
  const renderLeaf = useCallback((props) => <Leaf {...props} />, [])

  if (!ydoc) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Connecting to document...
      </div>
    )
  }

  return (
    <Slate editor={editor} initialValue={value} onChange={handleChange}>
      <Toolbar />
      <Editable
        className="min-h-[calc(100vh-120px)] px-16 py-8 text-gray-900 text-base leading-relaxed focus:outline-none max-w-4xl mx-auto"
        placeholder="Start writing — changes sync in real time..."
        readOnly={readOnly}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={(e) => handleKeyDown(e, editor)}
        spellCheck
        autoFocus
      />
    </Slate>
  )
}
