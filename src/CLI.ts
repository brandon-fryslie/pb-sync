import yargs from "yargs";

export const args = yargs(process.argv.slice(2))
  .scriptName('pb-sync.sh')
  .command({
    command: 'backup <name> <dir>',
    describe: 'sync Pixelblaze patterns to a directory',
    handler: () => null,
    builder: ((yargs: yargs.Argv<{}>) => {
      return yargs.positional('name', {
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
    describe: 'restore Pixelblaze patterns to a directory',
    handler: () => null,
    builder: ((yargs) => {
      return yargs.positional('dir', {
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
    describe: 'list discoverable Pixelblazes on the network',
    handler: () => null,
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
