# Phase 21 — Intelligence & Command Network

- Persistent last-known enemy contacts are tracked per team.
- Contacts are refreshed only when a friendly observer actually has line of sight.
- Contacts detected close enough to HQ, barracks, factory or helipad are shared through the command network.
- Stale contacts expire after 75 seconds.
- AI attacks visible targets first and otherwise may investigate fresh shared intelligence.
- The minimap shows faded X markers for shared last-known enemy positions.
- This layer is intentionally informational: it does not reveal units that have never been observed.
