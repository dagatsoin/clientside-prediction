import express from 'express';
import { URL } from 'url'
import http from 'http';
import WebSocket from 'ws';
import { actions, Intent } from '../actions';
import { parse, stringify } from '../business/lib/JSON';
import { createModel } from "../business/model";
import {
  World,
  IModel,
  SerializedWorld
} from "../business/types";
import { createServerRepresentation } from "../state/server";
import { IServerRepresentation } from "../state/types";
import { Timeline } from '../timeTravel/types';
import { ClientMessage, ServerMessage } from '../type';
import { getClients, addClient, forAllClients, getLatenceOf, deleteClient } from './clientList';

export interface IServer<T> {
  state: IServerRepresentation
  close(): void
  dispatch: (intent: Intent) => Promise<void>;
}

class Server implements IServer<World> {
  private wss: WebSocket.Server
  private server: http.Server
  constructor(
    private model: IModel<World, SerializedWorld> = createModel("server"),
  ) {
    const app = express();
    this.server = http.createServer(app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Add an end point to get the initial snapshot
    app.get('/snapshot', (_, res) => {
      res.send(stringify(this.state.snapshot));
    });

    this.wss.on('connection', (client: WebSocket, req) => {
      const id = getId(req.url)
      // For local developement, we wrap the send function to
      // add some latency
      const send = client.send;
      client.send = function(...args: any[]) {
        setTimeout(
          function() {
            send.apply(client, args as any)
          },
          getLatenceOf(id)
        )
      }

      // Remove client at disconnection
      client.onclose=function(e) {
        deleteClient(e.target)
      }
      addClient(id, client)
      client.onmessage = this.onMessage
    });
    
    //start our server
    this.server.listen(process.env.PORT || 3000, () => {
        console.log(`Server started on port ${JSON.stringify(this.server.address())}`);
    });

    
    this.state = createServerRepresentation(this.model);
  }
  
  state: IServerRepresentation;

  close() {
    this.wss.close()
    this.server.close()
    forAllClients(function(client) {
      deleteClient(client)
    })
  }

  onMessage = (ev: WebSocket.MessageEvent) => {
    // Use native parser to keep the serialized map
    const message: ClientMessage = JSON.parse(ev.data as string)
    /**
     * The client want to sync with the server.
     */
    if (message.type === "sync") {
      const devices = getClients(message.data.clientId)
      for (let device of devices) {
        device.send(stringify({
          type: "sync",
          data: {
            snapshot: this.state.timeTravel.getInitalSnapshot(),
            stepId: this.state.timeTravel.getInitialStep(),
            timeline: this.state.timeTravel.getTimeline()
          }
        } as ServerMessage))
      }
    }
    else if (message.type === "intent") {
      const input = message.data
      /**
       * The incoming intent is for a previous step.
       * The server need to modify the past.
       */
      if (message.data.stepId < this.state.stepId) {
        if (isAllowedAction(message.data.type, message.data.stepId)) {
          // We need to modify the past
          // Roll back the model to the input step id
          this.dispatch({
            type: "hydrate",
            payload: {
              snapshot: this.state.timeTravel.at(message.data.stepId),
              shouldRegisterStep: false
            }
          })
          let newSegment: Timeline<Intent>
          // Case 1: Client A has more latency but triggered the action before Client B
          if (message.data.timestamp < this.state.timeTravel.get(message.data.stepId).timestamp) {
            newSegment = this.state.timeTravel.modifyPast(message.data.stepId, (oldTimeline) => {
              // Insert the input action in the new timeline
              this.dispatch(input)
              
              // Then replay all the old timeline actions
              for (let i = message.data.stepId; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.dispatch(intent)
              }
            })
          }
          // Case 2: Client A triggered the action after Client B

          // TODO cancel NAPed animation when rollback
          else {
            newSegment = this.state.timeTravel.modifyPast(message.data.stepId, (oldTimeline) => {
              // Replay the previous action
              this.dispatch(oldTimeline[0].intent)
              
              // Trigger the new intent
              this.dispatch(input);

              // Then replay all the old timeline actions
              for (let i = message.data.stepId + 1; i < oldTimeline.length; i++) {
                const { intent } = oldTimeline[i]
                this.dispatch(intent);
              }
            })
          }
          console.info("Server modified past", parse(stringify(newSegment)))
          // The server has now a new "present"
          // We need to replay the new timeline on the clients.
          forAllClients((client) => {
            client.send(stringify({
              type: "rollback",
              data: {
                // The step to modify is the next one.
                to: message.data.stepId + 1,
                timeline: newSegment
              }
            } as ServerMessage))
          })
        }    
      } 
      /**
       * The client is ahead by a step.
       * This intent will create a new step on the server.
       */
      else {
        // Trigger the client action
        this.dispatch(input)
        if (this.model.patch.length) {
          console.info(`New server step ${this.state.timeTravel.getCurrentStepId()}`, this.state.timeTravel.get(this.state.timeTravel.getCurrentStepId()))
          forAllClients((client, id) => {   
            if (id !== input.clientId) {
              client.send(stringify({
                type: "intent",
                data: input
              } as ServerMessage))
            } else {
              client.send(stringify({
                type: "rollback",
                data: {
                  to: this.state.stepId,
                  timeline: [this.state.timeTravel.get(this.state.stepId)]
                }
              } as ServerMessage))
            }
          })
        }
      }
    }
  }

  dispatch = async (intent: Intent) => {
    this.state.timeTravel.startStep(intent)
    this.model.present(actions[intent.type](intent.payload as any));
  };
}

export function createServer() {
  return new Server();
}
function isAllowedAction(type: Intent["type"], stepId: number) {
  return type === "addPlayer"
}

function getId(url: any): string {
  // added a mock url if express do not send protocol and hostname
  const searchParams = new URL(url, "http://mockurl").searchParams
  if (searchParams.has("clientId")) {
    return searchParams.get("clientId")!
  }
  throw new Error(`A client connexion URL did not contain the client id ${url}`)
}
