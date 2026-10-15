import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isProceduralMapId} from './map-policy.js';
test('only seeded procedural maps are available to online rooms',()=>{
 for(const id of ['procedural-v8-balanced-1792-62510','procedural-v8-coastal-2048-4294967295','procedural-v2-river-17','procedural-v9-balanced-4096-0','procedural-v9-highlands-6144-27','procedural-v10-forest-4096-62510'])assert.equal(isProceduralMapId(id),true);
 for(const id of ['procedural-v9-balanced-2048-1','procedural-v8-balanced-6144-1','procedural-v10-forest-2048-7','roheorg','tutorial-logistics','operation-tidebreaker','procedural-v8-balanced-9999-1','procedural-v8-balanced-1792-4294967296',''])assert.equal(isProceduralMapId(id),false);
});

test('all current sizes are accepted without broadening historical version formats',()=>{
 for(const size of [2048,2560,3072,4096,5120,6144])assert.equal(isProceduralMapId(`procedural-v11-balanced-${size}-4294967295`),true);
 for(const id of ['procedural-v11-balanced-1280-1','procedural-v11-balanced-4096-4294967296','procedural-v11-unknown-2048-1','procedural-v10-balanced-2560-1'])assert.equal(isProceduralMapId(id),false);
});

test('custom terrain masks are bounded and retain size/version/seed restrictions',()=>{
 for(let mask=0;mask<16;mask++)assert.equal(isProceduralMapId(`procedural-v13-balanced-2048-42-o${mask}`),true);
 for(const id of ['procedural-v13-balanced-2048-42-o16','procedural-v13-balanced-2048-42-o01','procedural-v13-balanced-2048-4294967296-o0','procedural-v12-balanced-2048-42-o0'])assert.equal(isProceduralMapId(id),false);
});
