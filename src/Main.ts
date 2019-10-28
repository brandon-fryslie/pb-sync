import {args as ARGS} from "./CLI";

if (ARGS._.length == 0) {
  console.log('ERROR: no command provided');
  process.exit(1);
}

if (ARGS.verbose) {
  console.log('VERBOSE LOGS ENABLED');
}

const command: string = ARGS._[0];

if (command == 'backup') {
  const Backup = require('./Backup').Backup;
  const backup = new Backup;
  backup.run(ARGS.name, ARGS.dir).subscribe(() => {
    console.log('Backup finished!');
    process.exit(0)
  });
}

if (ARGS.repl) {
  require('./repl/repl').start({useGlobal: true})
}
