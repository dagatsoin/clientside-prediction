import { SerializedWorld, World } from "../business/types";
import { IServerAPI } from "./IServerAPI";
import { OfflineServerConnector } from "./offline";
//import { OnlineServerConnector } from "./online";

export type Mode = "offline" | "online";

/**
 * Simulate a server with 50ms ping
 */
export function createServer(
  mode: Mode
): IServerAPI<World, SerializedWorld, any> {
  return new OfflineServerConnector();
  /* return mode === "online"
    ? new OnlineServerConnector()
    : new OfflineServerConnector(); */
}
