import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isProceduralMapId} from './map-policy.js';
test('only seeded procedural maps are available to online rooms',()=>{
 for(const id of ['procedural-v8-balanced-1792-62510','procedural-v8-coastal-2048-4294967295','procedural-v2-river-17','procedural-v9-balanced-4096-0','procedural-v9-highlands-6144-27','procedural-v10-forest-4096-62510'])assert.equal(isProceduralMapId(id),true);
 for(const id of ['procedural-v9-balanced-2048-1','procedural-v8-balanced-6144-1','procedural-v10-forest-2048-7','roheorg','tutorial-logistics','operation-tidebreaker','procedural-v8-balanced-9999-1','procedural-v8-balanced-1792-4294967296',''])assert.equal(isProceduralMapId(id),false);
});
