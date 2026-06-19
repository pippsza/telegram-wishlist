import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { toast } from 'sonner';
import { ImageIcon, Bold, Italic, List, ListOrdered, Heading2, Quote, Code, Undo2, Redo2, Copy, Download, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuthToken } from '@/api/axios';
import { uploadNoteImage } from '@/api/notes';
import { useT } from '@/i18n';
import { compressImage } from './compressImage';

export type EditorConnStatus = 'connecting' | 'connected' | 'disconnected';
export interface EditorPeer {
  id: number;
  name: string;
  color: string;
}

interface NoteEditorProps {
  noteId: string;
  userName: string;
  userColor?: string;
  noteTitle?: string;
  // Bubble presence (status + remote peers) up to the page so it can render
  // in the page header instead of stealing toolbar space.
  onPresence?: (status: EditorConnStatus, peers: EditorPeer[]) => void;
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

export function NoteEditor({ noteId, userName, userColor, noteTitle, onPresence }: NoteEditorProps) {
  log('render', { noteId, userName, hasTitle: !!noteTitle });
  const t = useT();
  // Height of the on-screen keyboard reported by visualViewport. We reserve
  // that much space below the editor so the caret line never gets buried.
  const [kbInset, setKbInset] = useState(0);

  // visualViewport: when the soft keyboard slides up the visual viewport
  // shrinks. Push that delta as padding below the editor so the active line
  // stays visible above the keyboard. iOS Safari, Telegram WebView and
  // Chrome Android all expose this API.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(inset);
      // After the keyboard finishes its slide-up the caret may now be
      // hidden under it - chase it back into view.
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(false);
        const rect = range.getBoundingClientRect();
        const visibleBottom = vv.offsetTop + vv.height;
        if (rect.bottom > visibleBottom - 24) {
          window.scrollBy({ top: rect.bottom - (visibleBottom - 24), behavior: 'smooth' });
        }
      });
    };
    onResize();
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

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
    let lastStatus: EditorConnStatus = 'connecting';
    let lastPeers: EditorPeer[] = [];
    const onStatus = (e: { status: EditorConnStatus }) => {
      log('ws status', e.status);
      lastStatus = e.status;
      onPresence?.(lastStatus, lastPeers);
    };
    const onConnError = (err: Event) => logErr('ws connection-error', err);
    const onConnClose = (e: CloseEvent | null) => log('ws connection-close', { code: e?.code, reason: e?.reason });
    provider.on('status', onStatus);
    provider.on('connection-error', onConnError);
    provider.on('connection-close', onConnClose);

    const updateAwareness = () => {
      const states = provider.awareness.getStates();
      const list: EditorPeer[] = [];
      states.forEach((state, clientId) => {
        if (clientId === provider.awareness.clientID) return;
        const u = (state as { user?: { name: string; color: string } }).user;
        if (u) list.push({ id: clientId, name: u.name, color: u.color });
      });
      lastPeers = list;
      onPresence?.(lastStatus, lastPeers);
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

  // Scroll the caret into view inside the scroller above the keyboard. Uses
  // the live cursor DOM rect rather than ProseMirror's scrollIntoView so it
  // respects the visualViewport (keyboard) bottom, not just the container's
  // own bounds.
  const scrollCaretIntoView = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false);
    const rect = range.getBoundingClientRect();
    if (rect.top === 0 && rect.bottom === 0) return;
    const vv = window.visualViewport;
    const visibleBottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight);
    const margin = 24;
    if (rect.bottom > visibleBottom - margin) {
      const delta = rect.bottom - (visibleBottom - margin);
      window.scrollBy({ top: delta, behavior: 'smooth' });
    } else if (rect.top < (vv?.offsetTop ?? 0) + 60) {
      const delta = rect.top - ((vv?.offsetTop ?? 0) + 60);
      window.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: userName, color: userColor || colorFromName(userName) },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: t('notes_placeholder') }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: false }),
    ],
    autofocus: 'end',
    onSelectionUpdate: () => {
      // requestAnimationFrame so the new caret position is committed to the
      // DOM before we read its rect.
      requestAnimationFrame(scrollCaretIntoView);
    },
    onFocus: () => {
      // iOS opens the keyboard ~200ms after focus; wait for the viewport to
      // settle before measuring.
      setTimeout(scrollCaretIntoView, 250);
    },
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

  // Optimistic image insert: compress -> show local blob immediately ->
  // upload in the background -> swap the src to the server URL. Failed
  // uploads remove the placeholder so the document stays clean.
  async function insertUploadedImage(file: File) {
    if (!editor) return;
    const compressed = await compressImage(file, { maxDim: 1600, quality: 0.85 });
    const localUrl = URL.createObjectURL(compressed);
    editor.chain().focus().setImage({ src: localUrl }).createParagraphNear().run();

    try {
      const { url: serverUrl } = await uploadNoteImage(noteId, compressed);
      // Find the image node by its temporary blob src and rewrite the src
      // to the server URL. ProseMirror keeps the same node identity so
      // the caret position survives the swap.
      let foundPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === localUrl) {
          foundPos = pos;
          return false;
        }
      });
      if (foundPos >= 0) {
        editor.view.dispatch(editor.state.tr.setNodeAttribute(foundPos, 'src', serverUrl));
      }
      // Hold the blob URL briefly so the <img> can repaint with the server
      // src without flashing a broken icon.
      setTimeout(() => URL.revokeObjectURL(localUrl), 4000);
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error(t('common_failed_save'));
      // Remove the orphan placeholder so the user doesn't see a broken
      // <img> sitting in the doc.
      let foundPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === localUrl) {
          foundPos = pos;
          return false;
        }
      });
      if (foundPos >= 0) {
        editor.view.dispatch(editor.state.tr.delete(foundPos, foundPos + 1));
      }
      URL.revokeObjectURL(localUrl);
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleTaskList().run()} aria-label="Checklist">
          <ListChecks className="h-4 w-4" />
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
        <div className="ml-auto flex items-center gap-1 pr-1 text-[11px] text-muted-foreground">
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
      {/* Scrollable editor body. Bottom padding equals the keyboard inset so the
          active line is never covered by the on-screen keyboard. The tap-strip
          below the editor content focuses the document end, mirroring the
          Notion/Bear convention "tap empty space below to keep writing". */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: kbInset ? `${kbInset}px` : 'env(safe-area-inset-bottom, 0px)',
          scrollPaddingBottom: `${kbInset + 80}px`,
        }}
      >
        <EditorContent editor={editor} />
        {/* Floating quick-format menu (Notion / Bear style): appears above any
            non-empty text selection. Shorter trip than going to the toolbar. */}
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: 'top' }}
            shouldShow={({ editor: ed, from, to }) => from !== to && ed.isEditable}
          >
            <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Code">
                <Code className="h-3.5 w-3.5" />
              </Button>
            </div>
          </BubbleMenu>
        )}
        <div
          aria-hidden
          onClick={() => editor?.chain().focus('end').run()}
          className="min-h-[35vh] cursor-text"
        />
      </div>
    </div>
  );
}
