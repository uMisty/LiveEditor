import test from 'node:test'
import assert from 'node:assert/strict'
import {stableVersion,isNewerStableVersion} from '../shared/update'

test('accepts stable GitHub tags and rejects prereleases',()=>{
  assert.deepEqual(stableVersion('v1.2.3'),{tag:'v1.2.3',version:'1.2.3',parts:[1,2,3]})
  assert.equal(stableVersion('v1.2.3-beta.1'),undefined)
})

test('compares stable releases with installed semantic versions',()=>{
  assert.equal(isNewerStableVersion('0.1.0','v0.1.1'),true)
  assert.equal(isNewerStableVersion('1.9.9','v2.0.0'),true)
  assert.equal(isNewerStableVersion('2.0.0','v1.99.99'),false)
  assert.equal(isNewerStableVersion('2.0.0','v2.0.0'),false)
  assert.equal(isNewerStableVersion('2.0.0-beta.2','v2.0.0'),true)
})
