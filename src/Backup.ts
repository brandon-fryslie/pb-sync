import fs from "fs";
import * as Rx from "rxjs";

import DiscoveryAgent from './DiscoveryAgent'
import { PixelController } from "./PixelController";
import Util from './Util'

class Backup {
  private discoveryAgent: DiscoveryAgent;

  getPatternPath(dir: string, name: string): string {
    // pick a good filename
    const extension = "epe";
    const filename = name.replace(/[^\w]/g, '_');
    return `${ dir }/${ filename }.${ extension }`;
  }

  writePatternToFile(dir: string, name: string, content: string): void {
    const path = this.getPatternPath(dir, name);
    Util.vLog(`Backup.writePatternToFile: Writing pattern '${ name }' to path '${ path }'`);
    if (content[-1] !== "\n") {
      content = `${ content }\n`;
    }
    fs.writeFileSync(path, content);
  }

  backupPattern(dir: string, id: string, name: string, controller: PixelController): void {
    Util.vLog('Backup.backupPattern: backing up', id, name);
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
        Util.vLog(`Backup.checkDir: Dir '${ backupDir }' already exists`);
      } else {
        throw e;
      }
    }
    return backupDir;
  }

  run(pbName: string, dir: string): Rx.Observable<null> {
    return new Rx.Observable((observer) => {
      const pbBackupDir = this.checkDir(dir, pbName);
      console.log(`Backup: Starting backup of Pixelblaze '${ pbName }' to dir '${ pbBackupDir }'`);

      this.discoveryAgent = new DiscoveryAgent;
      this.discoveryAgent.start();

      return this.discoveryAgent.waitForPixelBlaze$(pbName).subscribe((controller) => {
        let i, id, j, len, len1, name;

        Util.vLog(`Backup: Controller is ready: '${ controller.config.name }'`);
        const programList = controller.patternList.getItems();

        Util.vLog(`Backup: Found Pixelblaze ${ controller.config.name }.  Backing up ${ (Object.keys(programList).length) } patterns:`);
        for (i = 0, len = programList.length; i < len; i++) {
          ({id, name} = programList[i]);
          Util.vLog(`- ${ name } (${ id })`);
        }

        for (j = 0, len1 = programList.length; j < len1; j++) {
          ({id, name} = programList[j]);
          this.backupPattern(pbBackupDir, id, name, controller);
        }
        console.log(`Backup: Wrote ${Object.keys(programList).length} pattern files .epe`);

        // Write a configuration file that preserves the filenames.  we'll use this when we restore
        const configFilename = "metadata.json";
        const configPath = `${ pbBackupDir }/${ configFilename }`;
        const configContents = {
          pixelBlazeId: id,
          pixelBlazeName: pbName,
          config: controller.config,
          // backup the program list, but only the id and name fields (not the code itself)
          programList: programList.map(({id, name}) => ({id, name}))
        };
        fs.writeFileSync(configPath, JSON.stringify(configContents, null, 2));
        console.log(`Backup: Wrote metadata file to '${configPath}'`);

        return observer.next();
      });
    });
  }
}


module.exports = {Backup};

