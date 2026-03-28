/**
 * Message Queue — KenganAuto
 * ──────────────────────────────────────────────────
 * In-memory queue with retry logic for outbound WhatsApp messages.
 *
 * Behaviour:
 *   - Adds jobs to a queue
 *   - On failure: retries up to MAX_RETRIES (3) times
 *   - Delay between retries: RETRY_DELAY_MS (5 minutes)
 *   - After 3 failures: marks job as FAILED
 *   - Exposes job status for monitoring dashboard
 *
 * Production upgrade path: swap this for BullMQ + Redis
 * keeping the exact same addJob() interface.
 */

const pino = require('pino');
const logger = pino({ name: 'message-queue' });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000;   // 5 minutes
const POLL_INTERVAL = 10 * 1000;        // check queue every 10s

const JOB_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    DONE: 'DONE',
    RETRYING: 'RETRYING',
    FAILED: 'FAILED',
};

class MessageQueue {
    constructor() {
        this._jobs = new Map();   // jobId → job object
        this._worker = null;
        this._paused = false;
    }

    /* ── Start the background processor ── */
    start() {
        if (this._worker) return;
        this._worker = setInterval(() => this._process(), POLL_INTERVAL);
        logger.info('Message queue started');
    }

    stop() {
        if (this._worker) { clearInterval(this._worker); this._worker = null; }
    }

    /* ── Add a job to the queue ── */
    addJob({ id, tenantId, type, payload, handler }) {
        const jobId = id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const job = {
            id: jobId,
            tenant_id: tenantId,
            type,
            payload,
            handler,          // async function (payload) => void
            status: JOB_STATUS.PENDING,
            attempts: 0,
            max_retries: MAX_RETRIES,
            next_attempt: Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error: null,
            logs: [],
        };
        this._jobs.set(jobId, job);
        logger.info({ jobId, type, tenantId }, 'Job queued');
        return jobId;
    }

    /* ── Background processor ── */
    async _process() {
        if (this._paused) return;
        const now = Date.now();
        const pending = Array.from(this._jobs.values()).filter(
            j => (j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.RETRYING) && j.next_attempt <= now
        );

        for (const job of pending) {
            job.status = JOB_STATUS.PROCESSING;
            job.attempts += 1;
            job.updated_at = new Date().toISOString();

            try {
                await job.handler(job.payload);
                job.status = JOB_STATUS.DONE;
                job.logs.push({ at: new Date().toISOString(), msg: 'Delivered successfully' });
                logger.info({ jobId: job.id }, 'Job completed');
            } catch (err) {
                const errMsg = err?.message || String(err);
                job.error = errMsg;
                job.logs.push({ at: new Date().toISOString(), msg: `Attempt ${job.attempts} failed: ${errMsg}` });

                if (job.attempts >= job.max_retries) {
                    job.status = JOB_STATUS.FAILED;
                    logger.error({ jobId: job.id, attempts: job.attempts }, 'Job permanently failed');
                } else {
                    job.status = JOB_STATUS.RETRYING;
                    job.next_attempt = Date.now() + RETRY_DELAY_MS;
                    logger.warn({ jobId: job.id, nextIn: `${RETRY_DELAY_MS / 60000}min` }, 'Job will retry');
                }
            }
            job.updated_at = new Date().toISOString();
        }
    }

    /* ── Inspection helpers ── */
    getJob(jobId) { return this._jobs.get(jobId) || null; }

    listJobs(tenantId, limit = 50) {
        return Array.from(this._jobs.values())
            .filter(j => !tenantId || j.tenant_id === tenantId)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, limit)
            .map(({ handler: _h, ...rest }) => rest);  // strip handler fn from output
    }

    /** Count jobs by status for dashboard metric */
    stats(tenantId) {
        const jobs = Array.from(this._jobs.values()).filter(j => !tenantId || j.tenant_id === tenantId);
        return jobs.reduce((acc, j) => {
            acc[j.status] = (acc[j.status] || 0) + 1;
            return acc;
        }, {});
    }

    pause() { this._paused = true; }
    resume() { this._paused = false; }
}

// Singleton — start automatically
const queue = new MessageQueue();
queue.start();

module.exports = { queue, JOB_STATUS };
