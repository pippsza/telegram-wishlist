import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { toast } from 'sonner';
import { ImageIcon, Bold, Italic, List, ListOrdered, Heading2, Quote, Code, Undo2, Redo2, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuthToken } from '@/api/axios';
import { uploadNoteImage } from '@/api/notes';
import { useT } from '@/i18n';

interface NoteEditorProps {
  noteId: string;
  userName: string;
  userColor?: string;
  noteTitle?: string;
}

// Deterministic pastel color from a name so each editor gets a stable cursor color.
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function safeFilename(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'note';
}

// Verbose logging that survives in production (no minification of console).
// Tag every message with [NoteEditor] so it's easy to grep in user-pasted logs.
const log = (...args: unknown[]) => console.log('[NoteEditor]', ...args);
const logErr = (...args: unknown[]) => console.error('[NoteEditor]', ...args);

export function NoteEditor({ noteId, userName, userColor, noteTitle }: NoteEditorProps) {
  log('render', { noteId, userName, hasTitle: !!noteTitle });
  const t = useT();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [peers, setPeers] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const ydoc = useMemo(() => {
    log('creating Y.Doc for', noteId);
    return new Y.Doc();
  }, [noteId]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const provider = useMemo(() => {
    const token = getAuthToken() || '';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/yws`;
    log('creating WebsocketProvider', { url, noteId, hasToken: !!token, tokenLen: token.length });
    try {
      return new WebsocketProvider(url, noteId, ydoc, { params: { token } });
    } catch (err) {
      logErr('WebsocketProvider constructor threw', err);
      throw err;
    }
  }, [noteId, ydoc]);

  useEffect(() => {
    log('subscribing provider events');
    const onStatus = (e: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      log('ws status', e.status);
      setStatus(e.status);
    };
    const onConnError = (err: Event) => logErr('ws connection-error', err);
    const onConnClose = (e: CloseEvent | null) => log('ws connection-close', { code: e?.code, reason: e?.reason });
    provider.on('status', onStatus);
    provider.on('connection-error', onConnError);
    provider.on('connection-close', onConnClose);

    const updateAwareness = () => {
      const states = provider.awareness.getStates();
      const list: Array<{ id: number; name: string; color: string }> = [];
      states.forEach((state, clientId) => {
        if (clientId === provider.awareness.clientID) return;
        const u = (state as { user?: { name: string; color: string } }).user;
        if (u) list.push({ id: clientId, name: u.name, color: u.color });
      });
      setPeers(list);
    };
    provider.awareness.on('change', updateAwareness);
    updateAwareness();

    return () => {
      log('teardown provider for', noteId);
      provider.off('status', onStatus);
      provider.off('connection-error', onConnError);
      provider.off('connection-close', onConnClose);
      provider.awareness.off('change', updateAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc, noteId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: userName, color: userColor || colorFromName(userName) },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: t('notes_placeholder') }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: false }),
    ],
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[60vh] p-3 focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void insertUploadedImage(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (images.length === 0) return false;
        event.preventDefault();
        void Promise.all(images.map(insertUploadedImage));
        return true;
      },
    },
  }, [provider]);

  async function insertUploadedImage(file: File) {
    try {
      const { url } = await uploadNoteImage(noteId, file);
      if (!editor) return;
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error('Image upload failed');
    }
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await insertUploadedImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function getMarkdown(): string {
    if (!editor) return '';
    const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string } | undefined>;
    return storage.markdown?.getMarkdown?.() ?? '';
  }

  async function copyAsMarkdown() {
    const md = getMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      toast.success(t('notes_copied_md'));
    } catch {
      toast.error(t('notes_clipboard_unavailable'));
    }
  }

  function downloadAsMarkdown() {
    const md = getMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename(noteTitle || 'note')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-14 z-10 flex items-center gap-1 border-b bg-background px-2 py-1 overflow-x-auto">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleBlockquote().run()} aria-label="Quote">
          <Quote className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} aria-label="Code">
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} aria-label="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        <div className="ml-auto flex items-center gap-2 pr-1 text-[11px] text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`} />
          {peers.length > 0 && (
            <div className="flex -space-x-1.5">
              {peers.slice(0, 3).map((p) => (
                <span
                  key={p.id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
                  style={{ background: p.color }}
                  title={p.name}
                >
                  {p.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor?.chain().focus().undo().run()} aria-label="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor?.chain().focus().redo().run()} aria-label="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAsMarkdown} aria-label="Copy as Markdown">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadAsMarkdown} aria-label="Download as Markdown">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
