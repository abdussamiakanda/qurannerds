import { useState, useRef, useEffect } from 'react'
import { 
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight,
  Link, BookOpen
} from 'lucide-react'
import AyahInsertModal from './AyahInsertModal'
import './RichTextEditor.css'

function RichTextEditor({ value, onChange, placeholder }) {
  const [showAyahModal, setShowAyahModal] = useState(false)
  const [activeCommands, setActiveCommands] = useState({})
  const editorRef = useRef(null)
  const isUpdatingRef = useRef(false)

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value !== undefined && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        isUpdatingRef.current = true
        editorRef.current.innerHTML = value || ''
        isUpdatingRef.current = false
      }
    }
  }, [value])

  // Update active command states
  const updateCommandStates = () => {
    const states = {}
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight']
    
    commands.forEach(cmd => {
      states[cmd] = document.queryCommandState(cmd)
    })
    
    const formatBlock = document.queryCommandValue('formatBlock')
    states.formatBlock = formatBlock
    
    setActiveCommands(states)
  }

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current || editorRef.current?.contains(document.activeElement)) {
        updateCommandStates()
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const handleInput = () => {
    if (isUpdatingRef.current) return
    
    const html = editorRef.current.innerHTML
    onChange(html)
    updateCommandStates()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const execCommand = (command, value = null) => {
    // Special handling for formatBlock commands
    if (command === 'formatBlock') {
      const currentFormat = document.queryCommandValue('formatBlock').toLowerCase()
      const targetFormat = value.toLowerCase()
      
      // Check if we're already in that format
      if (currentFormat === targetFormat) {
        // Toggle off by converting to paragraph
        document.execCommand('formatBlock', false, 'p')
      } else {
        // Apply the format
        document.execCommand('formatBlock', false, value)
      }
    } else {
      document.execCommand(command, false, value)
    }
    
    editorRef.current?.focus()
    handleInput()
    // Update states after a brief delay to ensure command is applied
    setTimeout(updateCommandStates, 10)
  }
  
  const toggleBlockquote = () => {
    const currentFormat = document.queryCommandValue('formatBlock').toLowerCase()
    if (currentFormat === 'blockquote') {
      document.execCommand('formatBlock', false, 'p')
    } else {
      document.execCommand('formatBlock', false, 'blockquote')
    }
    editorRef.current?.focus()
    handleInput()
    setTimeout(updateCommandStates, 10)
  }
  
  const toggleCodeBlock = () => {
    const currentFormat = document.queryCommandValue('formatBlock').toLowerCase()
    if (currentFormat === 'pre') {
      document.execCommand('formatBlock', false, 'p')
    } else {
      document.execCommand('formatBlock', false, 'pre')
    }
    editorRef.current?.focus()
    handleInput()
    setTimeout(updateCommandStates, 10)
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const handleInsertAyah = (html) => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    let range = null
    
    // Try to get current selection range
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0)
      // Ensure range is within editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        range = null
      }
    }
    
    // If no valid range, create one at the end of editor
    if (!range) {
      range = document.createRange()
      if (editorRef.current.childNodes.length > 0) {
        const lastNode = editorRef.current.lastChild
        range.setStartAfter(lastNode)
        range.collapse(false)
      } else {
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
      }
    }
    
    // Delete any selected content
    range.deleteContents()
    
    // Create a temporary container to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html.trim()
    
    // Find the quran-verse div (should be the first/main element)
    let verseDiv = tempDiv.querySelector('.quran-verse')
    
    // If no quran-verse div found, wrap the content in one
    if (!verseDiv) {
      verseDiv = document.createElement('div')
      verseDiv.className = 'quran-verse'
      verseDiv.innerHTML = tempDiv.innerHTML
      tempDiv.innerHTML = ''
      tempDiv.appendChild(verseDiv)
    }
    
    // Clone the verse div (deep clone to preserve all attributes)
    const clonedVerse = verseDiv.cloneNode(true)
    
    // Ensure data-verse-reference is preserved on the verse-header
    const header = clonedVerse.querySelector('.verse-header')
    if (header) {
      const referenceSpan = header.querySelector('.verse-reference')
      if (referenceSpan && !header.getAttribute('data-verse-reference')) {
        // If attribute is missing, set it from the text content
        const referenceText = referenceSpan.textContent.trim()
        if (referenceText) {
          header.setAttribute('data-verse-reference', referenceText)
        }
      }
    }
    
    // Insert the verse div
    range.insertNode(clonedVerse)
    
    // Move cursor after the verse
    const newRange = document.createRange()
    newRange.setStartAfter(clonedVerse)
    newRange.collapse(true)
    
    // Add a paragraph break after for better editing
    const br = document.createElement('br')
    newRange.insertNode(br)
    newRange.setStartAfter(br)
    newRange.collapse(true)
    
    selection.removeAllRanges()
    selection.addRange(newRange)
    
    handleInput()
    editorRef.current.focus()
  }

  const ToolbarButton = ({ icon: Icon, command, value, onClick, title, active }) => {
    const handleClick = (e) => {
      e.preventDefault()
      if (onClick) {
        onClick()
      } else {
        execCommand(command, value)
      }
    }

    return (
      <button
        type="button"
        className={`toolbar-btn ${active ? 'active' : ''}`}
        onClick={handleClick}
        title={title}
        aria-label={title}
      >
        <Icon size={18} />
      </button>
    )
  }

  return (
    <div className="rich-text-editor-wrapper">
      <div className="rich-text-editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            icon={Heading1}
            command="formatBlock"
            value="h1"
            title="Heading 1"
            active={activeCommands.formatBlock === 'h1'}
          />
          <ToolbarButton
            icon={Heading2}
            command="formatBlock"
            value="h2"
            title="Heading 2"
            active={activeCommands.formatBlock === 'h2'}
          />
          <ToolbarButton
            icon={Heading3}
            command="formatBlock"
            value="h3"
            title="Heading 3"
            active={activeCommands.formatBlock === 'h3'}
          />
        </div>

        <div className="toolbar-group">
          <ToolbarButton
            icon={Bold}
            command="bold"
            title="Bold"
            active={activeCommands.bold}
          />
          <ToolbarButton
            icon={Italic}
            command="italic"
            title="Italic"
            active={activeCommands.italic}
          />
          <ToolbarButton
            icon={Underline}
            command="underline"
            title="Underline"
            active={activeCommands.underline}
          />
          <ToolbarButton
            icon={Strikethrough}
            command="strikeThrough"
            title="Strikethrough"
            active={activeCommands.strikeThrough}
          />
        </div>

        <div className="toolbar-group">
          <ToolbarButton
            icon={List}
            command="insertUnorderedList"
            title="Bullet List"
            active={activeCommands.insertUnorderedList}
          />
          <ToolbarButton
            icon={ListOrdered}
            command="insertOrderedList"
            title="Numbered List"
            active={activeCommands.insertOrderedList}
          />
          <ToolbarButton
            icon={Quote}
            onClick={toggleBlockquote}
            title="Quote"
            active={activeCommands.formatBlock === 'blockquote'}
          />
          <ToolbarButton
            icon={Code}
            onClick={toggleCodeBlock}
            title="Code Block"
            active={activeCommands.formatBlock === 'pre'}
          />
        </div>

        <div className="toolbar-group">
          <ToolbarButton
            icon={AlignLeft}
            command="justifyLeft"
            title="Align Left"
            active={activeCommands.justifyLeft}
          />
          <ToolbarButton
            icon={AlignCenter}
            command="justifyCenter"
            title="Align Center"
            active={activeCommands.justifyCenter}
          />
          <ToolbarButton
            icon={AlignRight}
            command="justifyRight"
            title="Align Right"
            active={activeCommands.justifyRight}
          />
        </div>

        <div className="toolbar-group">
          <ToolbarButton
            icon={Link}
            onClick={insertLink}
            title="Insert Link"
          />
          <ToolbarButton
            icon={BookOpen}
            onClick={() => setShowAyahModal(true)}
            title="Insert Quranic Verse"
          />
        </div>
      </div>

      <div
        ref={editorRef}
        className="rich-text-editor-content"
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseUp={updateCommandStates}
        onKeyUp={updateCommandStates}
        onClick={updateCommandStates}
        data-placeholder={placeholder || 'Start writing...'}
        suppressContentEditableWarning
      />

      {showAyahModal && (
        <AyahInsertModal
          onClose={() => setShowAyahModal(false)}
          onInsert={handleInsertAyah}
        />
      )}
    </div>
  )
}

export default RichTextEditor
