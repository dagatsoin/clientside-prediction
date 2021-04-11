## Architecture

- Use the SAM Pattern
- The state function derivate the model into two representations :
  - one for the client
  - one for the time traveler

## Client side prediction

As the application is isomorph, the Model is common for the client and the server.
This allows to have a responding system while keeping a high level of security.
When the client execute a command (move the character), the code is executed locally
in the same way it would be on the server. We don't wait for the server ot respond.
As such, the player sees its character moving directly on the screen, without lag.
In the same time, the same request in sent to the server to get a verified response
because you know, "All players are cheaters".
When the server sends back its response, the data will be compared to the client
state. If it matches, nothing happens. If there is a difference, that means that
the client is in a different state. Maybe because it cheated, a network error, whatever...
In such case, the client rolls back to the time where the state diverges.
Then the state is recomputed with the data sent by the server, and both server and
client will be now in sync.

### Mixing HPB and LPB
Ping difference is a huge issue in code network.
Our rule to reach a concensus is called "Han shot first". Its main principle is to declare
winner the one who was the fastest to respond to the new step.
The system measure the time between a new step and the moment when the player performs
an action. As such, we handle relative time, not absolute time.
Example: Han and Greedo has a different ping. They received a new step (where they need
to shot each other). Han reveived the step 500ms after Greedo. 
Han shot Greedo 30ms after receiving the step.
Greedo shot Han 100ms after receiving the step.
The server will simply compare who was the fatest to respond to the new step.

### Messages types

The client can receive 3 types of message:

#### sync

The client will hydrate a new snapshot.

#### intent

The client will execture an action.

#### patch

The client diverges from the server step. It will apply a patch to get sync.