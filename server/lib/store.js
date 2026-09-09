const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class ObjectStore {
  constructor(root) { this.root = root; }
  async put(key, bytes) {
    const target = path.join(this.root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    return { key, versionId: crypto.randomUUID(), size: bytes.length, checksum: crypto.createHash('sha256').update(bytes).digest('hex') };
  }
  async get(key) { return fs.readFile(path.join(this.root, key)); }
}

class DocumentRepository {
  constructor(objectStore) { this.objectStore = objectStore; this.documents = new Map(); }
  create({ name, ownerId, access = [ownerId], metadata = {} }) {
    const document = { id: crypto.randomUUID(), name, ownerId, access: [...new Set(access)], metadata, lifecycle: 'IN_WORK', createdAt: new Date().toISOString(), revisions: [] };
    this.documents.set(document.id, document); return document;
  }
  get(id) { return this.documents.get(id); }
  canAccess(document, userId) { return document.ownerId === userId || document.access.includes(userId); }
  async addRevision(document, { filename, mediaType = 'application/octet-stream', content, comment = '', createdBy }) {
    const revision = String.fromCharCode(65 + document.revisions.length);
    const version = await this.objectStore.put(`${document.id}/${revision}/${crypto.randomUUID()}-${filename}`, content);
    const record = { id: crypto.randomUUID(), revision, filename, mediaType, comment, createdBy, createdAt: new Date().toISOString(), objectKey: version.key, objectVersionId: version.versionId, byteSize: version.size, checksumSha256: version.checksum, releaseStatus: 'IN_WORK' };
    document.revisions.push(record); return record;
  }
  release(document, revisionId) { const revision = document.revisions.find(item => item.id === revisionId); if (!revision) return null; revision.releaseStatus = 'RELEASED'; document.lifecycle = 'RELEASED'; revision.releasedAt = new Date().toISOString(); return revision; }
}
module.exports = { ObjectStore, DocumentRepository };
