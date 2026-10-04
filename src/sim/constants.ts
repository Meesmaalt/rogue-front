export const SIM_STEP = 1 / 30;
/** Real War style: start with solid supplies, low passive trickle. */
export const STARTING_CREDITS = 920;
export const INCOME_PER_SEC = 0.55;
export const MAX_QUEUE = 6;
export const ENEMY_AGGRO = 55;
export const STARTING_RESOURCES = 920;
/** Phase 61: captured industrial sites physically accumulate stock until transported. */
export const RESOURCE_INCOME_PER_SEC = 14;
export const RESOURCE_FACILITY_STARTUP = 8;
export const RESOURCE_FACILITY_MAX_STOCK = 1800;
export const RESOURCE_FACILITY_PRODUCTION = { mine: 8.5, oilfield: 7.2, factory: 11.5, depot: 5.5 } as const;
export const UPGRADE_COST = 140;
/** Logistics helicopter cargo delivered per successful run. */
export const LOGISTICS_CARGO = 95;
/** How often a depot can request a new supply helicopter (seconds). */
export const LOGISTICS_SPAWN_INTERVAL = 18;

/** Phase 60 strategic airlift. */
export const AIR_CARGO_INCOME_PER_SEC = 5.2;
export const AIR_CARGO_LOAD = 220;
export const AIR_CARGO_INTERVAL = 32;
export const AIR_CARGO_TRAVEL_MARGIN = 18;

/** Phase 62: road convoy logistics. */
export const ROAD_TRUCK_CARGO = 150;
export const ROAD_TRUCK_INTERVAL = 24;
export const ROAD_TRUCK_LOAD_TIME = 4.5;
export const ROAD_TRUCK_UNLOAD_TIME = 3.0;
export const ROAD_TRUCK_MAX_PER_DEPOT = 2;
export const ROAD_DEPOT_TRANSFER_RATE = 55;
