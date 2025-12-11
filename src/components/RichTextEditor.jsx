import { useMemo, useState, useRef, useEffect } from 'react'
import ReactQuill, { Quill } from 'react-quill'
import { BookOpen } from 'lucide-react'
import 'react-quill/dist/quill.snow.css'
import AyahInsertModal from './AyahInsertModal'
import './RichTextEditor.css'

const Block = Quill.import('blots/block')

Block.tagName = 'div'
Quill.register(Block, true)

// Register custom button handler
const Parchment = Quill.import('parchment')

class AyahButton {
  constructor(quill, options) {
    this.quill = quill
    this.options = options
    this.button = null
  }

  attach() {
    this.button = document.createElement('button')
    this.button.className = 'ql-ayah'
    this.button.type = 'button'
    this.button.innerHTML = '📖'
    this.button.title = 'Insert Quranic Verse'
    this.button.onclick = () => {
      if (this.options && this.options.onClick) {
        this.options.onClick()
      }
    }
  }
}

function RichTextEditor({ value, onChange, placeholder }) {
  const [showAyahModal, setShowAyahModal] = useState(false)
  const quillRef = useRef(null)
  const toolbarRef = useRef(null)

  useEffect(() => {
    if (!quillRef.current || toolbarRef.current) return

    const addAyahButton = () => {
      const quill = quillRef.current?.getEditor()
      if (!quill) return

      const toolbarContainer = quill.container.previousElementSibling
      if (!toolbarContainer || toolbarContainer.querySelector('.ql-ayah')) return

      // Create button wrapper
      const ayahButtonWrapper = document.createElement('span')
      ayahButtonWrapper.className = 'ql-formats'
      
      const button = document.createElement('button')
      button.className = 'ql-ayah'
      button.type = 'button'
      button.title = 'Insert Quranic Verse'
      button.setAttribute('aria-label', 'Insert Quranic Verse')
      button.onclick = (e) => {
        e.preventDefault()
        setShowAyahModal(true)
      }
      
      // Create SVG icon using BookOpen icon from lucide-react (same as logo)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('class', 'ql-icon')
      
      // BookOpen icon path from lucide-react
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path1.setAttribute('d', 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20')
      path1.setAttribute('class', 'ql-stroke')
      path1.setAttribute('stroke-width', '1.5')
      path1.setAttribute('stroke-linecap', 'round')
      path1.setAttribute('stroke-linejoin', 'round')
      
      svg.appendChild(path1)
      button.appendChild(svg)
      
      ayahButtonWrapper.appendChild(button)
      
      // Find a safe place to insert - look for the last ql-formats group
      const formats = toolbarContainer.querySelectorAll('.ql-formats')
      if (formats.length > 0) {
        const lastFormats = formats[formats.length - 1]
        if (lastFormats.parentNode) {
          lastFormats.parentNode.insertBefore(ayahButtonWrapper, lastFormats.nextSibling)
        } else {
          toolbarContainer.appendChild(ayahButtonWrapper)
        }
      } else {
        toolbarContainer.appendChild(ayahButtonWrapper)
      }
      
      toolbarRef.current = ayahButtonWrapper
    }

    // Wait for Quill to fully initialize
    const timeoutId = setTimeout(addAyahButton, 200)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ],
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'script',
    'indent',
    'blockquote', 'code-block',
    'link',
    'color', 'background',
    'align'
  ]

  const handleInsertAyah = (html) => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    try {
      // Get current selection or use end of document
      let range = quill.getSelection(true)
      let insertIndex = range ? range.index : quill.getLength() - 1
      
      // Ensure index is within bounds
      const currentLength = quill.getLength()
      insertIndex = Math.min(insertIndex, currentLength - 1)
      
      // Simply insert the HTML
      quill.clipboard.dangerouslyPasteHTML(insertIndex, html)
      
      // Add newlines after insertion and set cursor
      setTimeout(() => {
        try {
          const newLength = quill.getLength()
          const cursorPosition = newLength - 1
          quill.insertText(cursorPosition, '\n\n', 'user')
          quill.setSelection(cursorPosition + 2, 'user')
        } catch (err) {
          quill.focus()
        }
      }, 100)
    } catch (error) {
      console.error('Error inserting ayah:', error)
    }
  }

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="rich-text-editor"
      />
      <AyahInsertModal
        isOpen={showAyahModal}
        onClose={() => setShowAyahModal(false)}
        onInsert={handleInsertAyah}
      />
    </div>
  )
}

export default RichTextEditor

