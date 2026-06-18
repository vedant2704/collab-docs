import { useSlate } from 'slate-react'
import { Editor, Transforms } from 'slate'

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

const toggleMark = (editor, format) => {
  if (isMarkActive(editor, format)) Editor.removeMark(editor, format)
  else Editor.addMark(editor, format, true)
}

const isBlockActive = (editor, blockType) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && n.type === blockType,
  })
  return !!match
}

const toggleBlock = (editor, blockType) => {
  const isActive = isBlockActive(editor, blockType)
  Transforms.setNodes(
    editor,
    { type: isActive ? 'paragraph' : blockType },
    { match: (n) => Editor.isBlock(editor, n) }
  )
}

const Btn = ({ active, onMouseDown, title, children }) => (
  <button
    title={title}
    onMouseDown={(e) => { e.preventDefault(); onMouseDown() }}
    className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors
      ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
  >
    {children}
  </button>
)

const Sep = () => <div className="w-px h-5 bg-gray-200 mx-1" />

export default function Toolbar() {
  const editor = useSlate()
  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-200 bg-white flex-wrap">
      <Btn title="Bold (Ctrl+B)" active={isMarkActive(editor, 'bold')} onMouseDown={() => toggleMark(editor, 'bold')}><strong>B</strong></Btn>
      <Btn title="Italic (Ctrl+I)" active={isMarkActive(editor, 'italic')} onMouseDown={() => toggleMark(editor, 'italic')}><em>I</em></Btn>
      <Btn title="Underline (Ctrl+U)" active={isMarkActive(editor, 'underline')} onMouseDown={() => toggleMark(editor, 'underline')}><span style={{textDecoration:'underline'}}>U</span></Btn>
      <Btn title="Strikethrough" active={isMarkActive(editor, 'strikethrough')} onMouseDown={() => toggleMark(editor, 'strikethrough')}><span style={{textDecoration:'line-through'}}>S</span></Btn>
      <Btn title="Code" active={isMarkActive(editor, 'code')} onMouseDown={() => toggleMark(editor, 'code')}>{'<>'}</Btn>
      <Sep />
      <Btn title="Heading 1" active={isBlockActive(editor, 'heading-one')} onMouseDown={() => toggleBlock(editor, 'heading-one')}><span className="text-xs font-bold">H1</span></Btn>
      <Btn title="Heading 2" active={isBlockActive(editor, 'heading-two')} onMouseDown={() => toggleBlock(editor, 'heading-two')}><span className="text-xs font-bold">H2</span></Btn>
      <Btn title="Heading 3" active={isBlockActive(editor, 'heading-three')} onMouseDown={() => toggleBlock(editor, 'heading-three')}><span className="text-xs font-bold">H3</span></Btn>
      <Sep />
      <Btn title="Bullet list" active={isBlockActive(editor, 'bulleted-list')} onMouseDown={() => toggleBlock(editor, 'bulleted-list')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
        </svg>
      </Btn>
      <Btn title="Numbered list" active={isBlockActive(editor, 'numbered-list')} onMouseDown={() => toggleBlock(editor, 'numbered-list')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
          <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
        </svg>
      </Btn>
      <Btn title="Block quote" active={isBlockActive(editor, 'block-quote')} onMouseDown={() => toggleBlock(editor, 'block-quote')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
        </svg>
      </Btn>
    </div>
  )
}
