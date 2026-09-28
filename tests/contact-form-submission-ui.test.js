import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'assets/contact-form.js'), 'utf8');
const notification = readFileSync(resolve(process.cwd(), 'assets/form-notification.js'), 'utf8');
test('Contact form uses accessible reusable floating notifications', () => {
  assert.match(source, /LakeFormNotification\.create/); assert.match(source, /Sending your message…/); assert.match(source, /Message sent successfully/); assert.match(source, /button\.disabled=true/); assert.match(source, /form\.reset\(\)/); assert.match(source, /DELIVERY_TEMPORARILY_UNAVAILABLE/); assert.match(notification, /Reference: \$\{requestId\}/); assert.match(notification, /Dismiss notification/); assert.match(notification, /state === 'error' \? 'alert' : 'status'/); assert.match(notification, /aria-live/); assert.match(notification, /7000/);
});
