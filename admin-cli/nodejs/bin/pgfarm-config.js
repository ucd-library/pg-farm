import {Command} from 'commander';
import {config, save} from '../lib/config.js';
const program = new Command();

program.command('set <key> <value>')
  .description('set a config value')
  .action((key, value) => {
    config[key] = value;
    save();
  });

program.command('show')
  .alias('list')
  .option('-n, --name <key>', 'show a specific config value')
  .description('show current config')
  .action(options => {
    if(options.name) {
      console.log(config[options.name]);
      return;
    }

    for(let key in config) {
      console.log(`${key}: 
${config[key]}
`);
    }
  });

program.parse(process.argv);