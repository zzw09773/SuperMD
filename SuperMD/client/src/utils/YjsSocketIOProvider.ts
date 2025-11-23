import * as Y from 'yjs';
import { Socket } from 'socket.io-client';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';

export class YjsSocketIOProvider {
  doc: Y.Doc;
  socket: Socket;
  documentId: string;
  awareness: Awareness;

  private _onSyncUpdate: (data: { update: any }) => void;
  private _onSyncRequest: (data: { requesterId: string }) => void;
  private _onAwarenessUpdate: (data: { update: any }) => void;

  constructor(socket: Socket, documentId: string, doc: Y.Doc) {
    this.socket = socket;
    this.documentId = documentId;
    this.doc = doc;
    this.awareness = new Awareness(doc);

    // Bind handlers to preserve 'this' context
    this._onSyncUpdate = ({ update }: { update: any }) => {
      Y.applyUpdate(this.doc, new Uint8Array(update));
    };

    this._onSyncRequest = ({ requesterId }: { requesterId: string }) => {
      const state = Y.encodeStateAsUpdate(this.doc);
      this.socket.emit('sync-response', {
        targetId: requesterId,
        update: state
      });
    };

    this._onAwarenessUpdate = ({ update }: { update: any }) => {
      applyAwarenessUpdate(this.awareness, new Uint8Array(update), 'remote');
    };

    this.init();
  }

  init() {
    // 1. Listen to local Y.js updates and broadcast
    this.doc.on('update', (update: Uint8Array) => {
      this.socket.emit('sync-update', {
        documentId: this.documentId,
        update: update 
      });
    });

    // 2. Socket Listeners
    this.socket.on('sync-update', this._onSyncUpdate);
    this.socket.on('sync-request', this._onSyncRequest);
    this.socket.on('awareness-update', this._onAwarenessUpdate);

    // 3. Awareness (Cursors)
    this.awareness.on('update', ({ added, updated, removed }: any) => {
        const changedClients = added.concat(updated).concat(removed);
        const update = encodeAwarenessUpdate(this.awareness, changedClients);
        this.socket.emit('awareness-update', {
            documentId: this.documentId,
            update: update
        });
    });

    // Request initial sync
    this.socket.emit('sync-request', { documentId: this.documentId });
  }
  
  destroy() {
      this.awareness.destroy();
      this.socket.off('sync-update', this._onSyncUpdate);
      this.socket.off('sync-request', this._onSyncRequest);
      this.socket.off('awareness-update', this._onAwarenessUpdate);
  }
}
