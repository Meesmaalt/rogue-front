# Phase 55 — Online Warfare

Phase 55 extends the Phase 54 account/lobby layer into a persistent online service.

## Persistent player progression
- Server-side decks per faction.
- Ranked rating, XP, level and win/loss/draw record.
- Rating uses an Elo-style update against the opponent's current rating.
- Match results are tied to a real started room and are idempotent per player.

## Ranked matchmaking
- Players enter a server queue with faction/deck and rating.
- Queue matches players within a 250-rating initial band.
- Matched players are placed into a server-created ranked room.
- Ranked rooms use standard income, Wargame fog and HQ victory.

## Invites
- Hosts can invite online friends directly from a room.
- Invitations are server-side and expire logically when the room disappears or fills.

## Reconnect
- Started-room members retain their server-side identity and team.
- The client sends its reconnect token when the WebSocket is reopened.
- The server does not create a new player slot on reconnect.
- The lockstep room waits until both players are connected before advancing ticks.

## Spectators
- Authenticated users can request a spectator token for a live room.
- Spectators receive the authoritative tick stream but cannot submit commands or ready acknowledgements.
- A Live Games UI exposes active rooms.

## Result/progression flow
`battle ends -> client reports result + room -> server validates membership/status -> server updates rating/XP/stats -> room finishes`

The browser's local deck remains a convenience cache; selecting a deck also synchronizes it to the account server.
