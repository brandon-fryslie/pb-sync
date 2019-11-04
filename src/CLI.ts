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
    command: 'restore <dir> <fromName> <toName>',
    desc: 'restore Pixelblaze patterns to a directory',
    builder: ((yargs) => {
      yargs.positional('dir', {
        description: "the pb-sync data directory",
        type: 'string',
        demandOption: true,
      }).positional('fromName', {
        description: "the source pixelblaze",
        type: 'string',
        demandOption: true,
      }).positional('toName', {
        description: "the destination pixelblaze",
        type: 'string',
        demandOption: true,
      })
    })
  }).command({
    command: 'list',
    desc: 'list discoverable Pixelblazes on the network',
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
