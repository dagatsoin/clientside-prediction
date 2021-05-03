import express from 'express';
import { URL } from 'url'
import http from 'http';
import WebSocket from 'ws';
import { actions, Intent as _Intent } from '../actions';
import { parse, stringify } from '../business/lib/JSON';
import { createModel } from "../business/model";
import {
  World,
  IModel,
  SerializedWorld
} from "../business/types";
import { createServerRepresentation } from "../state/server";
import { IServerRepresentation } from "../state/types";
import { ClientMessage, ServerMessage } from '../type';
import { getClients, addClient, forAllClients, getLatenceOf, deleteClient } from './clientList';

export interface IServer<T> {
  state: IServerRepresentation
  close(): void
}

type Intent = _Intent & {triggeredAtStepId: number}

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
            triggeredAtStepId: message.data.stepId,
            payload: {
              snapshot: this.state.timeTravel.at(message.data.stepId),
              shouldRegisterStep: false
            }
          }, input.timestamp)
          // Case 1: The incoming message from client A at step S was triggered SOONER than client B.
          // We will return back to S-1 (so before B action) for dispatching A intent and replay the rest of the timeline.
          // TODO cancel NAPed animation when splice timeline
          const timestampOfA = message.data.timestamp
          const timestampOfB = this.state.timeTravel.get(message.data.stepId + 1).timestamp
          if (timestampOfA < timestampOfB) {
            this.state.timeTravel.forkPast(message.data.stepId, (oldTimeline) => {
              // Insert the input action in the new timeline
              // TODO use the timestamp of the client to recreate the same balistic context
              this.dispatch({type: input.type, payload: input.payload, triggeredAtStepId: message.data.stepId} as Intent, input.timestamp)
              
              // Then replay all the old timeline actions
              for (let i = 0; i < oldTimeline.length; i++) {
                this.dispatch(oldTimeline[i].intent, oldTimeline[i].timestamp)
              }
            })
          }
          // Case 2: The incoming message from client A at step S was triggered LATER than client B.
          // We will return back to S (so after B action) for dispatching A intent and replay the rest of the timeline.
          // TODO cancel NAPed animation when splice timeline
          else {
            // Maybe that sime client has alreay sent their intent for this step.
            // In this case, the server has already reorder the concurrent intents in further steps.
            // We will find in those steps where to insert the incoming intent.

            // A list of intents originaly triggered at the same step, before the server assigned
            // them to their own steps.
            const concurrentIntents = this.state.timeTravel
              .slice(message.data.stepId + 1)
              .filter(step => {
                if ("intent" in step) {
                  return step.intent.triggeredAtStepId === message.data.stepId
                }
              })

            const index = Math.max(
                concurrentIntents.findIndex(({timestamp}) => timestamp > message.data.timestamp),
                concurrentIntents.length // the incoming message is the last
              )
            + this.state.timeTravel.getInitialStep() // Rebase on step number

            this.state.timeTravel.forkPast(index, (oldTimeline) => {

              // Trigger the new intent
              this.dispatch({type: input.type, payload: input.payload, triggeredAtStepId: message.data.stepId} as Intent, input.timestamp);

              // Then replay all the old timeline actions
              // This will assign each old intent, if accepted, to another step.
              for (let i = 0; i < oldTimeline.length; i++) {
                this.dispatch(oldTimeline[i].intent, oldTimeline[i].timestamp)
              }
            })
          }
          console.info("Server modified past", parse(stringify((this.state.timeTravel.slice(input.stepId + 1) as any[]).map(({intent, timestamp})=>({intent: intent.type, timestamp, playerId: intent.payload.playerId})))))
          // The server has now a new "present"
          // We need to replay the new timeline on the clients.
          forAllClients((client) => {
            client.send(stringify({
              type: "splice",
              data: {
                // Replace client timeline.
                to: message.data.stepId + 1,
                timeline: this.state.timeTravel.slice(input.stepId + 1)
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
        this.dispatch({type: input.type, payload: input.payload, triggeredAtStepId: message.data.stepId} as Intent, input.timestamp)
        if (this.model.patch.length) {
          console.info(`New server step ${this.state.timeTravel.getCurrentStepId()}`, this.state.timeTravel.slice(this.state.timeTravel.getCurrentStepId()))
          forAllClients((client, id) => {   
            if (id !== input.clientId) {
              client.send(stringify({
                type: "intent",
                data: input
              } as ServerMessage))
            } else {
              client.send(stringify({
                type: "splice",
                data: {
                  // Replace timeline of the client starting from the step after it dispatched this message.
                  to: input.stepId + 1,
                  // Don't take only the current step id but grab all the steps
                  // created by this message (remember that one message
                  // could create multiple steps if some NAPs are involved)
                  timeline: this.state.timeTravel.slice(input.stepId + 1)
                }
              } as ServerMessage))
            }
          })
        }
      }
    }
  }

  private dispatch = (intent: Intent, timestamp?: number) => {
    this.state.timeTravel.startStep({...intent}, timestamp)
    this.model.present(actions[intent.type](intent.payload as any));
  };
}

export function createServer() {
  return new Server();
}
function isAllowedAction(type: Intent["type"], stepId: number) {
  return true
}

function getId(url: any): string {
  // added a mock url if express do not send protocol and hostname
  const searchParams = new URL(url, "http://mockurl").searchParams
  if (searchParams.has("clientId")) {
    return searchParams.get("clientId")!
  }
  throw new Error(`A client connexion URL did not contain the client id ${url}`)
}
