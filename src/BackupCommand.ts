import fs from "fs";
import * as Rx from "rxjs";

import DiscoveryAgent from './DiscoveryAgent'
import { PixelController } from "./PixelController";
import Util from './Util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('BackupCommand');

class BackupCommand {
  private discoveryAgent: DiscoveryAgent;

  writePatternToFile(dir: string, name: string, content: string): void {
    const path = Util.getPatternPath(dir, name);
    debug(`Backup.writePatternToFile: Writing pattern '${ name }' to path '${ path }'`);
    if (content[-1] !== "\n") {
      content = `${ content }\n`;
    }
    fs.writeFileSync(path, content);
  }

  backupPattern(dir: string, id: string, name: string, controller: PixelController): void {
    debug('Backup.backupPattern: backing up', id, name);
    const pattern = controller.patternList.getByName(name);
    if (!pattern) {
      throw new Error(`ERROR: Backup.backupPattern: Pattern '${ name }' does not exist on controller '${ controller.config.name }'`);
    }
    const content = pattern.code;
    // write pattern to file
    this.writePatternToFile(dir, name, content);
  }

  // checks the root directory to ensure it exists, and creates the subdir for the Pixelblaze
  // returns the backup dir
  checkDir(rootDir: string, pbName: string): string {
    if (!fs.existsSync(rootDir)) {
      // ensure directory exists
      throw `ERROR: Dir '${ rootDir }' does not exist`;
    }

    const backupDir = `${ rootDir }/${ pbName }`;
    try {
      fs.mkdirSync(backupDir);
    } catch (e) {
      if (e.code === 'EEXIST') {
        debug(`Backup.checkDir: Dir '${ backupDir }' already exists`);
      } else {
        throw e;
      }
    }
    return backupDir;
  }

  backupPatterns(controller: PixelController, pbBackupDir: string, pbName: string, observer: Rx.Observer<void>): void {
    const programList = controller.patternList.getItems();

    debug(`Backup: Found Pixelblaze ${ controller.config.name }.  Backing up ${ (Object.keys(programList).length) } patterns:`);

    programList.forEach(({id, name}) => {
      debug(`- ${ name } (${ id })`);
    });

    programList.forEach(({id, name}) => {
      this.backupPattern(pbBackupDir, id, name, controller);
    });

    console.log(`Backup: Wrote ${Object.keys(programList).length} pattern files .epe`);

    // Write a configuration file that preserves the filenames.  we'll use this when we restore
    const configFilename = "metadata.json";
    const configPath = `${ pbBackupDir }/${ configFilename }`;
    const configContents = {
      pixelBlazeId: controller.id,
      pixelBlazeName: pbName,
      config: controller.config,
      // backup the program list, but only the id and name fields (not the code itself)
      programList: programList.map(({id, name}) => ({id, name}))
    };
    fs.writeFileSync(configPath, JSON.stringify(configContents, null, 2));
    console.log(`Backup: Wrote metadata file to '${configPath}'`);

    observer.next();
  }

  run(pbName: string, dir: string): Rx.Observable<null> {
    return new Rx.Observable((observer) => {
      const pbBackupDir = this.checkDir(dir, pbName);
      console.log(`Backup: Starting backup of Pixelblaze '${ pbName }' to dir '${ pbBackupDir }'`);

      this.discoveryAgent = new DiscoveryAgent;
      this.discoveryAgent.start();

      return this.discoveryAgent.waitForPixelBlaze$(pbName).subscribe((controller) => {
        debug(`Backup: Controller is ready: '${ controller.config.name }'`);
        this.backupPatterns(controller, pbBackupDir, pbName, observer);
      });
    });
  }
}


module.exports = {Backup: BackupCommand};

