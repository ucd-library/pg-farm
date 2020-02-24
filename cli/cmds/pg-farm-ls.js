const program = require('commander');
const model = require('../../node-lib/models/cluster');

program
  .action(() => {
    try {
      let clusters = model.list();
      for( let cluster of clusters ) {
        console.log(cluster);
      }
    } catch(e) {
      console.error(e.message);
    }
  })
  .parse(process.argv)