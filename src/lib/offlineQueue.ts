// A small localStorage-backed retry queue for workout log POSTs. Each queued
// request carries the same client_id that was already sent in its body, so a
// later retry that actually reaches the server twice is a no-op upsert
// server-side rather than a duplicate set — see exercise_logs/run_logs.
//
// Scope: this queues the log POST itself (the common "patchy gym wifi"
// failure mode). It does NOT attempt to bootstrap a workout session while
// fully offline — that needs a real round-trip to get a session id the logs
// can reference, and the realistic failure mode this is built for is a
// connectivity drop mid-session, after the session already exists.

const QUEUE_KEY = "workout-log-queue";

type QueuedRequest = {
  id: string;
  url: string;
  body: Record<string, unknown>;
};

function readQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("offline-queue-changed"));
}

async function attemptPost(url: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Try to POST now; if it fails (offline/network error), queue it for later. */
export async function postWithQueue(url: string, body: Record<string, unknown>): Promise<void> {
  const ok = await attemptPost(url, body);
  if (!ok) {
    const id = body.client_id as string;
    const queue = readQueue();
    if (!queue.some((q) => q.id === id)) {
      queue.push({ id, url, body });
      writeQueue(queue);
    }
  }
}

/** Retry every queued request; drop the ones that succeed. */
export async function flushQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedRequest[] = [];
  for (const item of queue) {
    const ok = await attemptPost(item.url, item.body);
    if (!ok) remaining.push(item);
  }
  writeQueue(remaining);
}

export function queuedCount(): number {
  return readQueue().length;
}

/**
 * Deletes a previously-logged set by client_id, whether it already synced
 * or is still only sitting in the local queue. Removing it from the queue
 * stops a pending sync from resurrecting it; the DELETE call handles the
 * case where it already reached the server. Both run unconditionally since
 * we can't know from here which one actually applies.
 */
export async function deleteLoggedSet(url: string, clientId: string): Promise<void> {
  const queue = readQueue();
  const stillQueued = queue.some((q) => q.id === clientId);
  if (stillQueued) {
    writeQueue(queue.filter((q) => q.id !== clientId));
  }
  try {
    await fetch(`${url}?client_id=${encodeURIComponent(clientId)}`, { method: "DELETE" });
  } catch {
    // Deletion of an already-synced row failed silently (offline); the row
    // will still exist next time the app opens. Acceptable for this rare
    // edge case (deleting a set while offline) versus a full delete-queue.
  }
}
