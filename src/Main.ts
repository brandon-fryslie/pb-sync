import yargs from "yargs";
import { args as ARGS } from "./CLI";
import ListCommand from "./ListCommand";
import RestoreCommand from "./RestoreCommand";

if (ARGS._.length == 0) {
  console.log('ERROR: no command provided');
  process.exit(1);
}

if (ARGS.verbose) {
  console.log('VERBOSE LOGS ENABLED');
}

const command: string = ARGS._[0];

if (command == 'backup') {
  const Backup = require('./BackupCommand').Backup;
  const backup = new Backup;
  backup.run(ARGS.name, ARGS.dir).subscribe(() => {
    console.log('Backup finished!');
    process.exit(0)
  });
} else if (command == 'restore') {
  // not sure why unknown conversion is necessary here
  const restoreArgs = ARGS as unknown as yargs.Arguments<{fromName: string; toName: string; dir: string}>;
  const restoreCommand = new RestoreCommand;
  restoreCommand.run(restoreArgs.fromName, restoreArgs.toName, restoreArgs.dir).subscribe(() => {
    console.log('Somehow this completed!?'); // TODO: this will never happen
    process.exit(0)
  });
} else if (command == 'list') {
  const listCommand = new ListCommand;
  listCommand.run().subscribe(() => {
    console.log('Waited 60s.  Shutting it down');
    process.exit(0)
  });

} else {
  console.log(`ERROR: Unknown command '${ command }'`);
}

if (ARGS.repl) {
  require('./repl/repl').start({ useGlobal: true })
}
