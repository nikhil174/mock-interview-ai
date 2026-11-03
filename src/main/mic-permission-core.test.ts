import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowMicrophone, isAppOrigin } from './mic-permission-core.ts'

const APP = ['file://', 'http://localhost:5173']

test('audio capture from the app page is allowed', () => {
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['audio'], requestingUrl: 'file:///C:/app/index.html' }, APP), true)
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['audio'], requestingUrl: 'http://localhost:5173/' }, APP), true)
})

test('camera and screen requests are denied even from the app', () => {
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['video'], requestingUrl: 'file:///x.html' }, APP), false)
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['audio', 'video'], requestingUrl: 'file:///x.html' }, APP), false)
})

test('requests from another origin are denied', () => {
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['audio'], requestingUrl: 'https://evil.example/' }, APP), false)
})

test('non-media permissions are denied', () => {
  assert.equal(allowMicrophone({ permission: 'notifications', requestingUrl: 'file:///x.html' }, APP), false)
  assert.equal(allowMicrophone({ permission: 'geolocation', requestingUrl: 'file:///x.html' }, APP), false)
})

test('a request with no media types or no URL is denied', () => {
  assert.equal(allowMicrophone({ permission: 'media', requestingUrl: 'file:///x.html' }, APP), false)
  assert.equal(allowMicrophone({ permission: 'media', mediaTypes: ['audio'] }, APP), false)
})

test('malformed URLs do not throw', () => {
  assert.equal(isAppOrigin('not a url', APP), false)
})
