# Phase 54 — Online Command, Accounts & Match Lobby

This phase turns the multiplayer front-end into a persistent account-driven command lobby while preserving the existing lockstep combat simulation.

## Account layer

- Server-side persistent account database.
- Username + password authentication.
- Passwords stored with Node `scrypt` hashes and per-user salts.
- Session tokens kept server-side; the browser stores only the opaque session token.
- Player profile, country, friends and match statistics.
- Player search and mutual friend relationships.

## Lobby layer

- Public 1v1 room browser.
- Room creation with mission/map, faction, deck and match rules.
- Host authority is server-side.
- Host can change room name, mission/map and rules.
- Joining a room reserves a real server-side player slot.
- Faction and deck are stored in the room member record.
- READY/UNREADY is server validated.
- START BATTLE is host-only and requires exactly two members with both READY.
- Lobby chat is server-backed and retained for the lifetime of the room.
- Host transfer occurs if the host leaves before the match starts.

## Match layer

The game WebSocket no longer accepts anonymous joins. It requires:

1. A valid account session.
2. Membership in the requested room.
3. A room that has been explicitly started by its host.

Team assignment comes from authoritative room membership order. The room rules are delivered by the server to both clients.

## Match rules

- `standard` / `high` / `low` income modifies the passive credit stream.
- `wargame` / `reduced` / `off` fog changes the tactical visibility layer.
- `hq` uses the existing HQ destruction victory condition.
- `annihilation` requires eliminating every opposing entity.

The goal is deliberately hybrid: Real War-style base/resource progression remains the economic layer, while Wargame-style decks, reconnaissance, supply, combined arms and tactical combat remain the battlefield layer.
