import { CronJob } from 'cron';

/**
 * @function create
 * @description Create a new cron job.  Sets timezone to America/Los_Angeles
 * 
 * @param {String} cronTime string representing a cron job time, standard cron syntax 
 * @param {Function} callback function to run on cron job tick
 * @param {Function} onComplete Optional.  Function to run on cron job completion
 */
function create(cronTime, callback, onComplete=null) {
  return new CronJob(
    cronTime, // cronTime
    callback, // onTick
    onComplete, // onComplete
    false, // start
    'America/Los_Angeles' // timeZone
  );
}

export default create;