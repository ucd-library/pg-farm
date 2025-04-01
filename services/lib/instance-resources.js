import client from './pg-admin-client.js';

const msPerHour = 1000 * 60 * 60;
const msPerDay = msPerHour * 24;

const ALLOWED_LEVELS = ['ALWAYS', 'HIGH', 'MEDIUM', 'LOW'];

const HIGH_RESOURCES = {
  limits : {
    cpu : '2',
    memory : '4Gi'
  },
  requests : {
    cpu : '1',
    memory : '2Gi'
  }
}

const MEDIUM_RESOURCES = {
  limits : {
    cpu : '2',
    memory : '3Gi'
  },
  requests : {
    cpu : '750m',
    memory : '1Gi'
  }
}

const LOW_RESOURCES = {
  limits : {
    cpu : '1',
    memory : '2Gi'
  },
  requests : {
    cpu : '500m',
    memory : '500Mi'
  }
}

const XLOW_RESOURCES = {
  limits : {
    cpu : '1',
    memory : '1Gi'
  },
  requests : {
    cpu : '100m',
    memory : '250Mi'
  }
}

const SLEEP_AT = {
  'HIGH' : msPerDay*60, // 60 days
  'MEDIUM' : msPerDay*35, // 35 days
  'LOW' : msPerDay*7, // 7 days
}

const STATES = [{
  name: 'priority-10',
  resources: HIGH_RESOURCES,
  availableStates : {
    'ALWAYS' : -1,
    'HIGH' : msPerDay, // 1 days
    'MEDIUM' : (msPerHour * 8), // 8 hours
  }
},{
  name: 'priority-9',
  resources: HIGH_RESOURCES,
  availableStates : {
    'HIGH' : (msPerDay * 2), // 2 days
    'MEDIUM' : msPerDay, // 1 day
  }
},{
  name: 'priority-8',
  resources: MEDIUM_RESOURCES,
  availableStates : {
    'HIGH' : (msPerDay * 3), // 3 days
    'MEDIUM' : msPerDay, // 1 day,
    'LOW' : msPerHour, // 1 hour
  }
},{
  name: 'priority-7',
  resources: MEDIUM_RESOURCES,
  availableStates : {
    'HIGH' : msPerDay*4, // 4 days
    'MEDIUM' : msPerDay*2, // 2 day,
    'LOW' : msPerHour*2, // 2 hours
  }
},{
  name: 'priority-6',
  resources: MEDIUM_RESOURCES,
  availableStates : {
    'HIGH' : msPerDay*5, // 5 days
    'MEDIUM' : msPerDay*3, // 3 day,
    'LOW' : msPerHour*4, // 4 hours
  }
},{
  name: 'priority-5',
  resources: LOW_RESOURCES,
  availableStates : {
    'HIGH' : (msPerDay*7), // 7 days
    'MEDIUM' : msPerDay*4, // 4 day,
    'LOW' : msPerHour*8, // 4 hours
  }
},
{
  name: 'priority-4',
  resources: LOW_RESOURCES,
  availableStates : {
    'HIGH' : msPerDay*14, // 14 days
    'MEDIUM' : msPerDay*7, // 7 day,
    'LOW' : msPerHour*12, // 12 hours
  }
},
{
  name: 'priority-3',
  resources: LOW_RESOURCES,
  availableStates : {
    'MEDIUM' : msPerDay*21, // 21 day,
    'LOW' : msPerDay, // 1 day
  }
},
{
  name: 'priority-2',
  resources: XLOW_RESOURCES,
  availableStates : {
    'MEDIUM' : msPerDay*28, // 28 day,
    'LOW' : msPerDay*2, // 2 day
  }
},
{
  name: 'priority-1',
  resources: XLOW_RESOURCES,
  availableStates : {
    'LOW' : msPerDay*3, // 3 day
  }
},
{
  name: 'priority-0',
  resources: XLOW_RESOURCES,
  availableStates : {
    'LOW' : msPerDay*4, // 4 day
  }
}];

/**
 * @method getResources
 * @description This method returns the resources for the instance based on the availability level and 
 * last time the databases was queried.
 * 
 * @param {String} availability one of the allowed availability level: ALWAYS, HIGH, MEDIUM, LOW
 * @param {Number} lastQueryTime millisecond timestamp of the last time the database was queried 
 * @returns 
 */
function getResources(availability, lastQueryTime) {
  if( !ALLOWED_LEVELS.includes(availability) ) {
    throw new Error('Invalid availability level: ' + availability);
  }

  if (availability === 'ALWAYS') {
    return STATES[0];
  }
  const currentTime = new Date().getTime();
  const diff = currentTime - lastQueryTime;

  if( SLEEP_AT[availability] && SLEEP_AT[availability] < diff) {
    return {sleep: true};
  }

  let found = false;
  for (let i = 0; i < STATES.length; i++) {
    let state = STATES[i];

    // If the state is not defined, return the previous state
    if( found && !state.availableStates[availability] ) {
      return STATES[i-1];
    // we have not found the state yet.
    } else if( !state.availableStates[availability] ) {
      continue;
    }
    found = true;

    if (state.availableStates[availability] > diff) {
      return state;
    }
  }

  return STATES[STATES.length-1];
}

async function getMaxPriority(availability) {
  for (let i = 0; i < STATES.length; i++) {
    let state = STATES[i];

    if( state.availableStates[availability] ) {
      return parseInt(state.name.split('-')[1]);
    }
  }

  throw new Error('No priority found for availability: ' + availability);
}

async function getInstanceResources(instance, onStart) {
  if( typeof instance === 'string' ) {
    instance = await client.getInstance(instance);
  }

  // TODO need start time of the instance
  let e = await client.getLastDatabaseEvent(instance.instance_id);
  if( !e ) {
    console.warn('No events found for instance: ' + instance.instance_id);
    return STATES[1];
  }

  if( typeof e.timestamp === 'string' ) {
    e.timestamp = new Date(e.timestamp);
  }

  return getResources(instance.availability, e.timestamp.getTime());
}

export {
  getInstanceResources, getResources, getMaxPriority,
  STATES, ALLOWED_LEVELS, 
  HIGH_RESOURCES, MEDIUM_RESOURCES, LOW_RESOURCES, XLOW_RESOURCES
};