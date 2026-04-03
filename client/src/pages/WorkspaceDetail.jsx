import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/layout/Header';
import NoteEditor from '../components/notes/NoteEditor';
import toast from 'react-hot-toast';

export default function WorkspaceDetail() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoadingPage(true);
      // Fetch all workspaces and find the matching one
      const wsRes = await api.get('/workspaces');
      const ws = wsRes.data.data.find(w => w._id === id);
      if (!ws) {
        toast.error('Workspace not found');
        return;
      }
      setWorkspace(ws);

      const notesRes = await api.get(`/notes?workspace=${id}`);
      const notesData = notesRes.data.data || [];
      setNotes(notesData);
      if (notesData.length > 0) setActiveNote(notesData[0]);
    } catch (err) {
      toast.error('Failed to load workspace');
    } finally {
      setLoadingPage(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNoteCreated = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
    setActiveNote(newNote);
    setIsCreating(false);
  };

  const [confirmDeleteNote, setConfirmDeleteNote] = useState(null); // holds noteId to confirm

  const handleDeleteNote = async (noteId) => {
    if (confirmDeleteNote !== noteId) { setConfirmDeleteNote(noteId); return; }
    setConfirmDeleteNote(null);
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n._id !== noteId));
      if (activeNote?._id === noteId) setActiveNote(null);
      toast.success('Note deleted');
    } catch (e) {
      toast.error('Failed to delete note');
    }
  };

  if (loadingPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-tertiary)', gap: '0.75rem' }}>
        <i className="ri-loader-4-line" style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }} />
        Loading workspace...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-tertiary)' }}>
        Workspace not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header title={workspace.name} subtitle={workspace.description || 'Workspace'} />
      <div className="page-inner" style={{ flex: 1, display: 'flex', gap: '1.5rem', overflow: 'hidden', paddingBottom: 0 }}>

        {/* Notes Sidebar */}
        <div style={{
          width: '260px', flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          height: '100%', paddingRight: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              NOTES ({notes.length})
            </h3>
            <button
              onClick={() => { setIsCreating(true); setActiveNote(null); }}
              style={{
                background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer',
                fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <i className="ri-add-line" /> New
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {isCreating && (
              <div style={{
                padding: '0.75rem', borderRadius: '8px', marginBottom: '8px',
                background: 'var(--accent)', color: 'white',
                border: '1px solid var(--accent)', cursor: 'pointer',
                fontWeight: 500, fontSize: '0.9rem',
              }}>
                ✏️ Untitled Note
              </div>
            )}

            {notes.map(note => (
              <div
                key={note._id}
                onClick={() => { setActiveNote(note); setIsCreating(false); }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px', marginBottom: '8px',
                  background: activeNote?._id === note._id ? 'var(--card)' : 'transparent',
                  border: `1px solid ${activeNote?._id === note._id ? 'var(--border)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative',
                  paddingRight: '32px'
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--foreground)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {note.title || 'Untitled'}
                </div>
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2 }}>
                  {confirmDeleteNote === note._id ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }}
                        style={{ padding: '2px 6px', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}
                      >✓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteNote(null); }}
                        style={{ padding: '2px 6px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer', borderRadius: '4px', fontSize: '0.7rem' }}
                      >✕</button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }}
                      style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', borderRadius: '4px' }}
                      title="Delete Note"
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
                {note.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{
                        fontSize: '0.7rem', background: 'var(--background)',
                        padding: '1px 6px', borderRadius: '999px', color: 'var(--text-secondary)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {notes.length === 0 && !isCreating && (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', paddingTop: '1rem', textAlign: 'center' }}>
                <i className="ri-file-add-line" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }} />
                No notes yet.<br />Click "+ New" to start.
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1, height: '100%', paddingBottom: '1.5rem', minWidth: 0 }}>
          {(activeNote || isCreating) ? (
            <NoteEditor
              key={activeNote?._id || 'new'}
              noteId={activeNote?._id}
              workspaceId={id}
              initialData={activeNote}
              onNoteCreated={handleNoteCreated}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)', gap: '0.75rem',
            }}>
              <i className="ri-sticky-note-line" style={{ fontSize: '3rem' }} />
              <p>Select a note or create a new one</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
