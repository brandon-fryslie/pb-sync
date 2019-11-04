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
  const restoreCommand = new RestoreCommand;
  restoreCommand.run(ARGS.fromName, ARGS.toName, ARGS.dir).subscribe(() => {
    console.log('Waited 60s.  Shutting it down');
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
