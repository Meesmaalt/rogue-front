# Phase 60 – Real War strategic air logistics

- Resource points create strategic stock while controlled.
- Early logistics uses CH-47/Mi-26/Z-8 supply helicopters from the map edge to forward supply depots. These are physical aircraft and can be intercepted.
- A level-2 developed airbase (`producer-2`) unlocks automatic strategic cargo flights.
- C-130J / Il-76 / Y-9 cargo aircraft spawn outside the map, carry a reserved cargo load, fly to the airbase, deliver it, then exit.
- Destroying a cargo plane before delivery loses the reserved cargo.
- The airlift pool, delivered total, losses and flights are exposed through `airliftStatus`.
- This is intentionally a bridge between Real War economy and Wargame tactical combat; later phases can add fuel reserves, air corridors, convoy/route interception and multiple airfields.
