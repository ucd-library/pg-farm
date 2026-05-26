import client from './pg-admin-client.js';
import logger from './logger.js';

const msPerHour = 1000 * 60 * 60;
const msPerDay  = msPerHour * 24;

const ALLOWED_LEVELS = ['ALWAYS', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Resource definitions per availability type.
 *
 * limits        — sticky while the pod is ON; sized so postgres can always start cleanly.
 * activeRequests — applied when the instance is receiving queries (scheduling guarantee + PDB=1).
 * idleRequests   — applied when no queries have arrived for idleAfter ms (soft hint only, PDB=0).
 *
 * helperLimits / helperActiveRequests / helperIdleRequests — same semantics for the pg-helper sidecar.
 *
 * idleAfter  — ms of inactivity before switching to idle requests (null = never idle).
 * sleepAfter — ms of inactivity before stopping the pod entirely (null = never sleep).
 */
const TYPES = {
  ALWAYS: {
    priorityClass        : 'priority-8',
    priorityValue        : 8,
    limits               : { cpu: '4',    memory: '8Gi'   },
    activeRequests       : { cpu: '2',    memory: '6Gi'   },
    idleRequests         : { cpu: '100m', memory: '512Mi' },
    helperLimits         : { cpu: '500m', memory: '512Mi' },
    helperActiveRequests : { cpu: '200m', memory: '256Mi' },
    helperIdleRequests   : { cpu: '50m',  memory: '64Mi'  },
    idleAfter            : null,
    sleepAfter           : null,
  },
  HIGH: {
    priorityClass        : 'priority-8',
    priorityValue        : 8,
    limits               : { cpu: '4',    memory: '8Gi'   },
    activeRequests       : { cpu: '2',    memory: '6Gi'   },
    idleRequests         : { cpu: '100m', memory: '512Mi' },
    helperLimits         : { cpu: '500m', memory: '512Mi' },
    helperActiveRequests : { cpu: '200m', memory: '256Mi' },
    helperIdleRequests   : { cpu: '50m',  memory: '64Mi'  },
    idleAfter            : msPerHour,       // 1 hour
    sleepAfter           : msPerDay * 60,   // 60 days
  },
  MEDIUM: {
    priorityClass        : 'priority-5',
    priorityValue        : 5,
    limits               : { cpu: '2',    memory: '4Gi'   },
    activeRequests       : { cpu: '1',    memory: '3Gi'   },
    idleRequests         : { cpu: '100m', memory: '256Mi' },
    helperLimits         : { cpu: '500m', memory: '512Mi' },
    helperActiveRequests : { cpu: '200m', memory: '256Mi' },
    helperIdleRequests   : { cpu: '50m',  memory: '64Mi'  },
    idleAfter            : msPerHour / 2,   // 30 minutes
    sleepAfter           : msPerDay * 35,   // 35 days
  },
  LOW: {
    priorityClass        : 'priority-2',
    priorityValue        : 2,
    limits               : { cpu: '1',    memory: '2Gi'   },
    activeRequests       : { cpu: '500m', memory: '1536Mi' },
    idleRequests         : { cpu: '100m', memory: '128Mi' },
    helperLimits         : { cpu: '500m', memory: '512Mi' },
    helperActiveRequests : { cpu: '200m', memory: '256Mi' },
    helperIdleRequests   : { cpu: '50m',  memory: '64Mi'  },
    idleAfter            : msPerHour / 4,   // 15 minutes
    sleepAfter           : msPerDay * 7,    // 7 days
  },
};

/**
 * @function getType
 * @description Returns the resource type definition for a given availability level.
 *
 * @param {string} availability one of ALWAYS | HIGH | MEDIUM | LOW
 * @returns {Object} type definition from TYPES
 */
function getType(availability) {
  if( !ALLOWED_LEVELS.includes(availability) ) {
    throw new Error('Invalid availability level: ' + availability);
  }
  return TYPES[availability];
}

/**
 * @function getInstanceState
 * @description Determines whether a running instance should be active, idle, or sleeping
 * based on the time since the last database event.
 *
 * Returns { action: 'active'|'idle'|'sleep', type } where type is the TYPES entry
 * for the instance's availability level.
 *
 * @param {Object} ctx instance context
 * @returns {Promise<{action: string, type: Object}>}
 */
async function getInstanceState(ctx) {
  const type = getType(ctx.instance.availability);

  if( ctx.instance.availability === 'ALWAYS' ) {
    return { action: 'active', type };
  }

  const e = await client.getLastDatabaseEvent(ctx.instance.instance_id);
  if( !e ) {
    logger.warn('No events found for instance, treating as idle', ctx.logSignal);
    return { action: 'idle', type };
  }

  const ts   = typeof e.timestamp === 'string' ? new Date(e.timestamp) : e.timestamp;
  const diff = Date.now() - ts.getTime();

  if( type.sleepAfter && diff > type.sleepAfter ) {
    return { action: 'sleep', type };
  }
  if( type.idleAfter && diff > type.idleAfter ) {
    return { action: 'idle', type };
  }
  return { action: 'active', type };
}

export {
  getInstanceState, getType,
  TYPES, ALLOWED_LEVELS,
};
