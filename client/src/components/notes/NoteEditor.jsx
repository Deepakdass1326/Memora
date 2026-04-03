import React, { useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import api, { aiApi } from '../../services/api';
import toast from 'react-hot-toast';
import './NoteEditor.scss';

/* ── Toolbar Button ─────────────────────────────────────── */
function ToolBtn({ active, onClick, title, children }) {
  return (
    <button
      className={`ne-toolbar__btn${active ? ' active' : ''}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

/* ── Main Editor ────────────────────────────────────────── */
export default function NoteEditor({ noteId, workspaceId, initialData, onNoteCreated }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState(null); // 'generate' | 'summarize' | null
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState(''); // interim text shown as preview
  const recognitionRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing… or use ✨ AI or 🎙️ Voice below.',
      }),
    ],
    content: initialData?.content || '',
  });

  /* ── Save ───────────────────────────────────────────── */
  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim() || 'Untitled Note',
        content: editor.getHTML(),
        workspace: workspaceId,
      };
      if (noteId) {
        await api.put(`/notes/${noteId}`, payload);
        toast.success('Note saved');
      } else {
        const { data } = await api.post('/notes', payload);
        toast.success('Note created');
        if (onNoteCreated) onNoteCreated(data.data);
      }
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── AI: Generate ───────────────────────────────────── */
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await aiApi.post('/ai/generate-note', { prompt: aiPrompt });
      editor.commands.setContent(data.data.content);
      setAiPrompt('');
      setAiMode(null);
      toast.success('Note generated ✨');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── AI: Summarize ──────────────────────────────────── */
  const handleSummarize = async () => {
    if (!editor) return;
    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>') {
      toast.error('No content to summarize');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await aiApi.post('/ai/summarize', { content: currentContent });
      // Append summary below existing content
      editor.commands.setContent(
        currentContent +
          `<h2>Summary</h2>${data.data.summary}`
      );
      setAiMode(null);
      toast.success('Summary added ✨');
    } catch {
      toast.error('Summarization failed');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Speech-to-Text: Real-time dictation ────────────── */
  const toggleRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser (use Chrome)');
      return;
    }

    // Stop if already recording
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // get partial results while speaking
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // ✅ Final chunk → insert directly into editor at cursor position
          setLiveTranscript('');
          editor.commands.focus();
          editor.commands.insertContent(transcript.trim() + ' ');
        } else {
          // 🔄 Still speaking → show as live preview
          interim = transcript;
        }
      }

      setLiveTranscript(interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscript('');
    };

    recognition.onerror = (e) => {
      console.error('SpeechRecognition error', e);
      setIsRecording(false);
      setLiveTranscript('');
      if (e.error !== 'aborted') toast.error('Voice recognition error: ' + e.error);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.success('🎙️ Listening — speak now…');
  }, [isRecording, editor]);

  if (!editor) return null;

  return (
    <div className="note-editor">
      {/* Header */}
      <div className="note-editor__header">
        <input
          className="note-editor__title"
          placeholder="Untitled Note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="ne-btn ne-btn--save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <><i className="ri-loader-4-line ne-spin" /> Saving…</>
          ) : (
            <><i className="ri-save-line" /> Save</>
          )}
        </button>
      </div>

      {/* Formatting Toolbar */}
      <div className="ne-toolbar">
        <div className="ne-toolbar__group">
          <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></ToolBtn>
          <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></ToolBtn>
          <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></ToolBtn>
        </div>
        <div className="ne-toolbar__divider" />
        <div className="ne-toolbar__group">
          <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolBtn>
          <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolBtn>
          <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolBtn>
        </div>
        <div className="ne-toolbar__divider" />
        <div className="ne-toolbar__group">
          <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><i className="ri-list-unordered" /></ToolBtn>
          <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List"><i className="ri-list-ordered" /></ToolBtn>
          <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><i className="ri-double-quotes-r" /></ToolBtn>
          <ToolBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block"><i className="ri-code-line" /></ToolBtn>
        </div>
        <div className="ne-toolbar__divider" />
        {/* AI Actions */}
        <div className="ne-toolbar__group">
          <button
            className={`ne-btn ne-btn--ai${aiMode === 'generate' ? ' active' : ''}`}
            onClick={() => setAiMode(aiMode === 'generate' ? null : 'generate')}
            title="Generate with AI"
            type="button"
          >
            <i className="ri-sparkling-line" /> Generate
          </button>
          <button
            className="ne-btn ne-btn--ai"
            onClick={handleSummarize}
            disabled={aiLoading}
            title="Summarize current note"
            type="button"
          >
            <i className="ri-file-reduce-line" /> Summarize
          </button>
          <button
            className={`ne-btn ne-btn--voice${isRecording ? ' recording' : ''}`}
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            type="button"
          >
            <i className={isRecording ? 'ri-stop-circle-line' : 'ri-mic-line'} />
            {isRecording ? ' Stop' : ' Voice'}
          </button>
        </div>
      </div>

      {/* AI Generate Panel */}
      {aiMode === 'generate' && (
        <div className="ne-ai-panel">
          <div className="ne-ai-panel__inner">
            <i className="ri-sparkling-2-fill ne-ai-panel__icon" />
            <input
              className="ne-ai-panel__input"
              placeholder='e.g. "Explain React hooks in simple terms" or "Create meeting notes for a product review"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !aiLoading && handleGenerate()}
              autoFocus
            />
            <button
              className="ne-btn ne-btn--save"
              onClick={handleGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              type="button"
            >
              {aiLoading ? (
                <><i className="ri-loader-4-line ne-spin" /> Generating…</>
              ) : (
                'Generate ✨'
              )}
            </button>
            <button
              className="ne-btn ne-btn--ghost"
              onClick={() => { setAiMode(null); setAiPrompt(''); }}
              type="button"
            >
              ✕
            </button>
          </div>
          {aiLoading && (
            <div className="ne-ai-panel__progress">
              <div className="ne-ai-panel__bar" />
            </div>
          )}
        </div>
      )}

      {/* Live Voice Transcript Preview */}
      {isRecording && (
        <div className="ne-voice-bar">
          <span className="ne-voice-bar__dot" />
          <span className="ne-voice-bar__label">Listening</span>
          <span className="ne-voice-bar__divider" />
          <span className="ne-voice-bar__text">
            {liveTranscript || <span className="ne-voice-bar__idle">speak now…</span>}
          </span>
          <button
            className="ne-voice-bar__stop"
            onClick={toggleRecording}
            type="button"
          >
            <i className="ri-stop-circle-fill" /> Stop
          </button>
        </div>
      )}

      {/* TipTap Content */}
      <EditorContent editor={editor} className="note-editor__content" />
    </div>
  );
}
