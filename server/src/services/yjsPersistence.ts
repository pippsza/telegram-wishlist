import * as Y from 'yjs';
import { Note } from '../models/Note';
import { User } from '../models/User';
import { Types } from 'mongoose';
import {
  displayName,
  getPartnerForPair,
  notifyPartnerText,
  pickLang,
  type Lang,
} from './notifications';

const utils = require('y-websocket/bin/utils');

interface WSSharedDoc extends Y.Doc {
  name: string;
}

// Tiptap collaboration extension stores the document in this XmlFragment by default.
const TIPTAP_FRAGMENT = 'default';

// Per-document "currently editing" state, used to debounce the partner notification.
interface EditingState {
  timer: NodeJS.Timeout | null;
  lastNotifiedAt: number;
  lastEditorId: string | null;
}
const editingState = new Map<string, EditingState>();
const EDIT_NOTIFY_DEBOUNCE_MS = 5 * 60 * 1000;

function extractPlainText(ydoc: Y.Doc): string {
  try {
    const frag = ydoc.getXmlFragment(TIPTAP_FRAGMENT);
    const xml = frag.toString();
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
  } catch {
    return '';
  }
}

function noteEditingText(actor: string, title: string, lang: Lang): string {
  return {
    ru: `📝 *${actor}* редактирует заметку: ${title}`,
    uk: `📝 *${actor}* редагує нотатку: ${title}`,
    en: `📝 *${actor}* is editing a note: ${title}`,
  }[lang];
}

async function notifyEditingPartner(noteId: string, editorUserId: string) {
  try {
    const note = await Note.findById(noteId);
    if (!note || !note.pair) return;
    const [actor, partner] = await Promise.all([
      User.findById(editorUserId),
      getPartnerForPair(editorUserId, note.pair.toString()),
    ]);
    if (!actor || !partner) return;
    // If the partner is already connected to this doc, they see edits live - no need to ping.
    if (isUserConnectedTo(noteId, partner._id.toString())) return;
    const text = noteEditingText(displayName(actor), note.title || 'Untitled', pickLang(partner));
    await notifyPartnerText(partner, text);
  } catch (err) {
    console.error('Notify editing partner error:', err);
  }
}

// Track the editor whose connection last opened (used for lastEditedBy attribution).
const lastEditorByDoc = new Map<string, string>();
// Track all currently-connected userIds per docName. Used to suppress partner notifications
// when both members of a pair already have the doc open.
const connectedUsersByDoc = new Map<string, Set<string>>();

export function trackEditor(noteId: string, userId: string) {
  lastEditorByDoc.set(noteId, userId);
  let set = connectedUsersByDoc.get(noteId);
  if (!set) {
    set = new Set();
    connectedUsersByDoc.set(noteId, set);
  }
  set.add(userId);
}

export function untrackEditor(noteId: string, userId?: string) {
  if (userId) {
    const set = connectedUsersByDoc.get(noteId);
    if (set) {
      set.delete(userId);
      if (set.size === 0) connectedUsersByDoc.delete(noteId);
    }
  }
  // Keep around briefly so the final writeState can attribute lastEditedBy correctly.
  setTimeout(() => lastEditorByDoc.delete(noteId), 30000);
}

function isUserConnectedTo(noteId: string, userId: string): boolean {
  return connectedUsersByDoc.get(noteId)?.has(userId) ?? false;
}

function scheduleEditNotice(noteId: string, editorUserId: string) {
  const now = Date.now();
  const state = editingState.get(noteId) || { timer: null, lastNotifiedAt: 0, lastEditorId: null };
  state.lastEditorId = editorUserId;
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.lastNotifiedAt = Date.now();
    state.timer = null;
    notifyEditingPartner(noteId, editorUserId);
  }, 2000);
  // First edit after a long pause: fire immediately, then keep the debounce window open.
  if (now - state.lastNotifiedAt > EDIT_NOTIFY_DEBOUNCE_MS) {
    state.lastNotifiedAt = now;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    notifyEditingPartner(noteId, editorUserId);
  }
  editingState.set(noteId, state);
}

export function setupYjsPersistence() {
  utils.setPersistence({
    provider: 'mongo',
    bindState: async (docName: string, ydoc: WSSharedDoc) => {
      try {
        if (!Types.ObjectId.isValid(docName)) return;
        const note = await Note.findById(docName);
        if (note?.yjsState) {
          Y.applyUpdate(ydoc, note.yjsState);
        }
        ydoc.on('update', () => {
          const editor = lastEditorByDoc.get(docName);
          if (editor) scheduleEditNotice(docName, editor);
        });
      } catch (err) {
        console.error('Yjs bindState error:', err);
      }
    },
    writeState: async (docName: string, ydoc: WSSharedDoc) => {
      try {
        if (!Types.ObjectId.isValid(docName)) return;
        const update = Y.encodeStateAsUpdate(ydoc);
        const plainText = extractPlainText(ydoc);
        const editor = lastEditorByDoc.get(docName);
        const patch: Record<string, unknown> = {
          yjsState: Buffer.from(update),
          plainText,
        };
        if (editor) patch.lastEditedBy = new Types.ObjectId(editor);
        await Note.updateOne({ _id: docName }, { $set: patch });
      } catch (err) {
        console.error('Yjs writeState error:', err);
      }
    },
  });
}

export const wsUtils = utils as {
  setupWSConnection: (ws: unknown, req: unknown, opts: { docName: string; gc?: boolean }) => void;
};
