import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const capability='cedros-data:native-storefront-policy-read-v1';
test('all shipped Pay manifests declare mandatory host policy dependency and requirement',()=>{
 const canonical=JSON.parse(readFileSync(new URL('cedros-extension.manifest.json',root),'utf8'));
 const bootstrap=JSON.parse(readFileSync(new URL('cedros-extension.bootstrap.json',root),'utf8')).manifest;
 const native=JSON.parse(readFileSync(new URL('ui/react-native/src/extensionManifest.generated.json',root),'utf8'));
 for(const manifest of [canonical,bootstrap,native]){
  assert.equal(manifest.version,canonical.version);
  assert.ok(manifest.requiredCapabilities.includes(capability));
  const dependencies=manifest.dependencies.capabilities.filter(item=>item.capabilityId===capability);
  assert.equal(dependencies.length,1);
  assert.equal(dependencies[0].required,true,'Data rejects service invocation without an explicit required dependency');
 }
 assert.deepEqual(bootstrap,canonical);assert.deepEqual(native,canonical);
});
