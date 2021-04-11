export const nodes: Map<string, {latence: number, cb: (message: MessageEvent<string>) => void}> = new Map()

export type ISocket = Pick<WebSocket, "send" | "onclose" | "onerror" | "onmessage" | "onopen">

export function getLatenceOf(id: string) {
  return nodes.get(id)?.latence
}

export function disconnectAll() {
  nodes.clear()
}

class Socket implements ISocket {
  private queue: string[] = []
  private get latence() {
    return nodes.get(this.id)!.latence
  }
  
  constructor(private id: string) {
    const latence = id === "server" ? 0 :Math.floor(Math.random() * 500)
    nodes.set(id, {
      latence,
      // simulate network latency
      cb: (message: MessageEvent<any>) => {
        const currentLatence = nodes.get(id)?.latence
        setTimeout(() => this.onmessage(message), currentLatence)
      }
    })
  }
  onclose = (ev: CloseEvent) => {
    nodes.delete(this.id)
  }
  onerror = (ev: Event) => {console.warn("Call empty onerror on mocked websocket", this.id)};
  get onmessage() {
    return (message: MessageEvent<any>) => {console.warn("Call empty onmessage on mocked websocket", this.id)};
  }
  set onmessage(handler: (message: MessageEvent<any>) => void) {
    nodes.get(this.id)!.cb = handler
  }
  onopen = (ev: Event) => {console.warn("Call empty onopen on mocked websocket", this.id)};
  
  /**
   * Send data to server or, if the server is the sender, broadcast to all clients.
   */
  send = (data: string | ArrayBufferLike | Blob | ArrayBufferView): void => {
    if (this.id === "server") {
      nodes.forEach(({cb}) => cb(new MessageEvent('message', {data: data as string})))
    } else {
      this.queue.push(data as string)  
      const nextStep = this.queue.shift()!;
      nodes.get("server")!.cb(new MessageEvent('message', {data: nextStep}))
    }
  }
}

export function createSocket(clientId: string, latence?: number): ISocket {
  return new Socket(clientId)
}