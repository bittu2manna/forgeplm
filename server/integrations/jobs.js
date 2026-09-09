const crypto = require('node:crypto');
class IntegrationJobQueue {
  constructor({ maxAttempts = 3, backoffMs = 250, onFailure = () => {} } = {}) { this.maxAttempts = maxAttempts; this.backoffMs = backoffMs; this.onFailure = onFailure; this.jobs = new Map(); this.adapters = new Map(); }
  register(event, adapter) { this.adapters.set(event, adapter); }
  enqueue(event, payload) { const job = { id: crypto.randomUUID(), event, payload, status: 'QUEUED', attempts: 0, logs: [], failure: null, createdAt: new Date().toISOString() }; this.jobs.set(job.id, job); void this.run(job); return job; }
  async run(job) { const adapter = this.adapters.get(job.event); if (!adapter) return this.fail(job, new Error(`No adapter registered for ${job.event}`)); while (job.attempts < this.maxAttempts) { job.attempts++; job.status = 'RUNNING'; job.logs.push({ at: new Date().toISOString(), level: 'info', message: `Attempt ${job.attempts} started` }); try { job.result = await adapter.execute(job.payload, { jobId: job.id, attempt: job.attempts, log: message => job.logs.push({ at: new Date().toISOString(), level: 'info', message }) }); job.status = 'SUCCEEDED'; job.completedAt = new Date().toISOString(); return; } catch (error) { job.logs.push({ at: new Date().toISOString(), level: 'error', message: error.message }); if (job.attempts < this.maxAttempts) await new Promise(resolve => setTimeout(resolve, this.backoffMs * job.attempts)); } } this.fail(job, new Error(job.logs.at(-1).message)); }
  fail(job, error) { job.status = 'FAILED'; job.failure = { message: error.message, at: new Date().toISOString() }; this.onFailure(job); }
  get(id) { return this.jobs.get(id); }
}
module.exports = { IntegrationJobQueue };
