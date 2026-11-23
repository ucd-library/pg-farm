import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import { instanceModel, config } from '../../lib/index.js'
import print from './print.js';
import organization from './organization.js';
import colors from 'colors';
import {printWarningBox, confirmYes} from './confirm.js';

const PUBLIC_USER_ACTIONS = ['status', 'enable', 'disable'];

class Instances {

  parseOrg(instName) {
    if (instName.match('/')) {
      let parts = instName.split('/');
      return {
        organization: parts[0],
        instance: parts[1]
      };
    }

    return {
      organization: null,
      instance: instName
    };
  }

  async create(opts) {
    let resp = await instanceModel.create(opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async list(opts={}) {
    let query = {}
    if( opts.organization ) {
      query.organization = opts.organization;
    }
    if( opts.state ) {
      query.state = opts.state;
    }
    if( opts.limit ) {
      query.limit = opts.limit;
    }
    if( opts.offset ) {
      query.offset = opts.offset;
    }

    let resp = await instanceModel.list(query);
    print.display(resp, opts.output, print.instances);
    process.exit(0);
  }

  async get(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.get(organization, instance);

    print.display(resp, opts.output, print.instance);
    process.exit(0);
  }

  async addUser(name, user, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.addUser(organization, instance, user, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async updateUser(name, user, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.updateUser(organization, instance, user, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async deleteUser(name, user, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.deleteUser(organization, instance, user);

    print.display(resp, opts.output);
    process.exit(0);
  }

  /**
   * @method publicUser
   * @description Show status of, enable or disable (remove) the instance public user.
   * Disabling always prints the public user's current table/view permissions first
   * and asks for confirmation unless --yes is provided.  --dry-run prints the summary
   * and planned steps without making changes.
   *
   * @param {String} action status, enable or disable
   * @param {String} name org/instance name
   * @param {Object} opts
   * @param {Boolean} opts.dryRun optional.  do not make changes
   * @param {Boolean} opts.yes optional.  skip confirmation prompt
   * @param {String} opts.output optional.  output format
   */
  async publicUser(action, name, opts={}) {
    if( !PUBLIC_USER_ACTIONS.includes(action) ) {
      console.error(`Invalid action: ${action}. Must be one of: ${PUBLIC_USER_ACTIONS.join(', ')}`);
      process.exit(1);
    }

    let { organization, instance } = this.parseOrg(name);
    let textOutput = !opts.output;

    // status
    if( action === 'status' ) {
      let resp = await instanceModel.getPublicUser(organization, instance);
      print.display(resp, opts.output, print.publicUserSummary);
      process.exit(resp.error ? 1 : 0);
    }

    let enable = (action === 'enable');
    let setFn = (dryRun) => enable ?
      instanceModel.enablePublicUser(organization, instance, {dryRun}) :
      instanceModel.disablePublicUser(organization, instance, {dryRun});

    // always fetch the dry run first so we can show what will change
    let plan = await setFn(true);
    if( plan.error ) {
      print.display(plan, opts.output);
      process.exit(1);
    }

    if( opts.dryRun ) {
      if( textOutput ) {
        this._printPublicUserPlan(enable, plan.payload);
        console.log(colors.cyan('Dry run, no changes made.'));
      } else {
        print.display(plan, opts.output);
      }
      process.exit(0);
    }

    if( textOutput ) {
      this._printPublicUserPlan(enable, plan.payload);
    }

    if( !opts.yes ) {
      let confirmed = await confirmYes(enable ?
        'Type "yes" to enable the public user, anything else to cancel:' :
        'Type "yes" to disable and remove the public user and its permissions, anything else to cancel:'
      );
      if( !confirmed ) {
        console.log(colors.yellow('Cancelled, no changes made.'));
        process.exit(1);
      }
    }

    let resp = await setFn(false);
    if( resp.error ) {
      print.display(resp, opts.output);
      process.exit(1);
    }

    let result = resp.payload;
    if( textOutput ) {
      print.publicUserSteps(result.steps, 'Completed');
      if( result.errors?.length ) {
        console.log(colors.red('Errors:'));
        result.errors.forEach(e => console.log(colors.red(`  ${e.database ? e.database+' ' : ''}${e.step}: ${e.message}`)));
      }
      console.log(`Public user is now ${result.enabled ? colors.green('ENABLED') : colors.yellow('DISABLED')}`);
    } else {
      print.display(resp, opts.output);
    }

    process.exit(result.errors?.length ? 1 : 0);
  }

  /**
   * @method _printPublicUserPlan
   * @description Print the warning and planned steps for a public user enable/disable
   *
   * @param {Boolean} enable true if enabling
   * @param {Object} plan dry run result from the api
   */
  _printPublicUserPlan(enable, plan) {
    if( enable ) {
      if( plan.alreadyEnabled ) {
        console.log(colors.yellow('The public user is already enabled for this instance. Enabling again will refresh the role and api grants.'));
      }
      printWarningBox('PUBLIC ACCESS', [
        `Enabling the public user allows ANYONE to connect to every database on instance ${plan.instance} `+
        'using the shared, publicly documented public user credentials, and enables anonymous PostgREST API access.',
        '',
        'The public user will only have access to the api schema. Table permissions removed by a previous disable are NOT restored.'
      ]);
      print.publicUserSteps(plan.steps, 'Planned steps');
      console.log();
      return;
    }

    let summary = plan.summary || {};
    if( !summary.enabled ) {
      console.log(colors.yellow('The public user is already disabled for this instance. Disabling again will clean up any remaining postgres role.'));
    }
    let c = summary.counts || {read: 0, write: 0};
    printWarningBox('WARNING - REMOVES PERMISSIONS', [
      `Disabling (removing) the public user on instance ${plan.instance} will remove ALL of its permissions `+
      `in every database on the instance, including ${c.write} table/view(s) with WRITE and ${c.read} with READ access listed below.`,
      '',
      'Anyone connecting with the public user, anonymous PostgREST API access and database links (FDW) that use it will stop working.',
      '',
      'Re-enabling the public user will NOT restore these permissions.'
    ]);
    print.publicUserSummary(summary);
    console.log();
    print.publicUserSteps(plan.steps, 'Planned steps');
    console.log();
  }

  async stop(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.stop(organization, instance);
    print.display(resp, opts.output);
    process.exit(0);
  }

  async start(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.start(organization, instance, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async restart(name, opts) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.restart(organization, instance);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async updatePriority(name, priority, opts) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.updatePriority(organization, instance, priority, opts.apply);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async backup(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/instance/${instance}/backup`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to backup instance', await resp.text());
      return;
    }

    console.log(`Started instance backup: ${instance}`);
  }

  async archive(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/instance/${instance}/archive`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to archive instance', await resp.text());
      return;
    }

    console.log(`Started instance archive: ${instance}`);
  }

  async restore(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/instance/${instance}/restore`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to restore instance', await resp.text());
      return;
    }

    console.log(`Started instance restore: ${instance}`);
  }

  async resize(instance, size) {
    instance = formatInstName(instance);

    let params = new URLSearchParams({size});

    let resp = await fetch(`${config.host}/api/instance/${instance}/resize?${params}`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to resize instance', await resp.text());
      return;
    }

    console.log(`Started instance resize: ${instance}`);
    console.log(resp.body);
  }

  async syncUsers(name, opts) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.syncUsers(organization, instance, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

}

function formatInstName(name) {
  if( !name.match(/\//) ) {
    name = '_/'+name;
  }
  if( !name.match(/\/inst-/) ) {
    name = name.split('/').join('/inst-');
  }
  return name;
}

const instance = new Instances();
export default instance;