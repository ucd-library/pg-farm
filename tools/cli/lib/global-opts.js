
function wrap(program) {
  program
    .configureHelp({ showGlobalOptions: true })
    .option('-o, --output <format>', 'Output format (json, yaml, quiet). Default is custom text or yaml depending on the commad')
}

export default wrap;