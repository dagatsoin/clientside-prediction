import { SerializedWorld, World } from "../business/types";
import { IServerAPI, StepPatch } from "./IServerAPI";

export class OnlineServerConnector
  implements IServerAPI<World, SerializedWorld, any> {
  public onMessage?: (stepPatch: StepPatch) => void;
  private ws: WebSocket | undefined;
  connect = (): Promise<World | Error> => {
    return new Promise((r, e) => {
      this.ws = new WebSocket("wss://unydm.sse.codesandbox.io/");
      this.ws.onerror = function (event) {
        console.log("WebSocket error observed:", event);
        e(new Error("Connexion error"));
      };
      this.ws.onmessage = (event: MessageEvent) => {
        this.onMessage?.(JSON.parse(event.data));
      };
      this.ws.onopen = async function (event) {
        console.info("Connected to online server.");
        r({ entities: [] });
      };
    });
  };

  send = <I extends { type: string; payload: any; step: number }>(
    intent: I
  ) => {
    if (this.ws === undefined) {
      console.error(
        "IServer.send. Websocket is not available. Call IServer.connect first"
      );
    } else {
      this.ws.send(JSON.stringify(intent));
    }
  };
}
