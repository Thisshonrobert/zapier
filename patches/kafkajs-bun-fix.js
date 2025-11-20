
// file patches/kafkajs-bun-fix.js

/**
 * Patch for KafkaJS to fix TimeoutNegativeWarning with Bun runtime
 * Issue: https://github.com/tulios/kafkajs/issues/1751
 * 
 * This script patches the RequestQueue class to handle invalid timeout values
 */

const fs = require('fs');
const path = require('path');

// Try multiple possible paths
const possiblePaths = [
  path.join(__dirname, '../node_modules/kafkajs/src/network/requestQueue/index.js'),
  path.join(__dirname, '../apps/core/node_modules/kafkajs/src/network/requestQueue/index.js'),
];

let filePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    filePath = p;
    break;
  }
}

if (!filePath) {
  console.log('KafkaJS file not found in any expected location, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// Check if already patched
if (content.includes('// PATCHED FOR BUN')) {
  console.log('KafkaJS already patched');
  process.exit(0);
}

// Find and replace the scheduleCheckPendingRequests function
const originalFunction = `  scheduleCheckPendingRequests() {
    // If we're throttled: Schedule checkPendingRequests when the throttle
    // should be resolved. If there is already something scheduled we assume that that
    // will be fine, and potentially fix up a new timeout if needed at that time.
    // Note that if we're merely "overloaded" by having too many inflight requests
    // we will anyways check the queue when one of them gets fulfilled.
    let scheduleAt = this.throttledUntil - Date.now()
    if (!this.throttleCheckTimeoutId) {
      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      }
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, scheduleAt)
    }
  }`;

const patchedFunction = `  scheduleCheckPendingRequests() {
    // PATCHED FOR BUN - Fix TimeoutNegativeWarning
    // If we're throttled: Schedule checkPendingRequests when the throttle
    // should be resolved. If there is already something scheduled we assume that that
    // will be fine, and potentially fix up a new timeout if needed at that time.
    // Note that if we're merely "overloaded" by having too many inflight requests
    // we will anyways check the queue when one of them gets fulfilled.
    let scheduleAt = this.throttledUntil - Date.now()
    
    // Validate scheduleAt to prevent negative or invalid timeouts
    if (!Number.isFinite(scheduleAt)) {
      this.logger.warn('Invalid scheduleAt computed for throttle; using fallback interval', {
        scheduleAt,
        throttledUntil: this.throttledUntil,
        broker: this.broker,
        clientId: this.clientId,
      })
      scheduleAt = CHECK_PENDING_REQUESTS_INTERVAL
    }
    
    if (!this.throttleCheckTimeoutId) {
      // If nothing pending and no future throttle, don't schedule
      if (this.pending.length === 0 && scheduleAt <= 0) {
        return
      }

      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      } else {
        scheduleAt = Math.max(0, scheduleAt)
      }
      
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, scheduleAt)
    }
  }`;

content = content.replace(originalFunction, patchedFunction);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ KafkaJS patched successfully for Bun runtime');

