type Listener = (userId: string) => void

const listeners: Listener[] = []

export function onAccountCreated(fn: Listener): () => void {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i !== -1) listeners.splice(i, 1)
  }
}

export function emitAccountCreated(userId: string): void {
  listeners.forEach(fn => {
    try { fn(userId) } catch {}
  })
}
