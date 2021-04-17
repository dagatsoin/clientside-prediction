import WebSocket from 'ws';

if ((global as any)["wsClients"] === undefined) {
  (global as any)["wsClients"] = new Map()
}

const clients: Map<string, WebSocket[]> = (global as any)["wsClients"]
const latence: Map<string, number> = new Map()

export function addClient(id: string, client: WebSocket) {
  clients.get(id)?.push(client) ?? clients.set(id, [client])
  setLatence(id, Math.random() * 200)
}

export function getClients(id: string): WebSocket[] {
  return clients.get(id) ?? []
}

export function forAllClients(handler: (client: WebSocket, id: string) => void) {
  clients.forEach(function(clients, id) {
    clients.forEach(function(client) { 
      handler(client, id)
    })
  });
}

export function deleteClient(socket: WebSocket) {
  for (let client of clients) {
    const index = client[1].indexOf(socket)
    if (index > -1) {
      client[1].splice(index, 1)
    }
  }
}

export function setLatence(id: string, delay: number) {
  latence.set(id, delay)
}

export function getLatenceOf(id: string): number {
  return latence.get(id)!
}
