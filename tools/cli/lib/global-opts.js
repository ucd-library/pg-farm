
function wrapCmd(command) {
  command.option('-o, --output <format>', 'Output format (json, yaml, quiet). Default is custom text or yaml depending on the commad')
}

function wrapAllCmds(program) {
  program.commands.forEach(command => {
    wrapCmd(command);
  });
}

export {wrapAllCmds, wrapCmd};