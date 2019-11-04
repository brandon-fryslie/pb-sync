import yargs from "yargs";

export const args = yargs(process.argv.slice(2))
  .scriptName('pb-sync.sh')
  .command({
    command: 'backup <name> <dir>',
    desc: 'sync Pixelblaze patterns to a directory',
    builder: ((yargs) => {
      yargs.positional('name', {
        description: "the Pixelblaze's name",
        type: 'string',
        demandOption: true
      }).option('dir', {
        alias: 'd',
        type: 'string',
        description: 'the directory to use for the backup',
        demandOption: true
      })
    })
  }).command({
    command: 'restore <dir> <from-name> <to-name>',
    desc: 'restore Pixelblaze patterns to a directory',
    builder: ((yargs) => {
      yargs.positional('name', {
        description: "the Pixelblaze's name",
        type: 'string',
        demandOption: true
      }).option('dir', {
        alias: 'd',
        type: 'string',
        description: 'the directory to use for the backup',
        demandOption: true
      })
    })
  }).option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'enable verbose logging',
    default: false
  }).showHelpOnFail(true)
  .demandCommand()
  .recommendCommands()
  .strict()
  .help()
  .argv;
