// Restore patterns to a device

import fs from "fs";
import * as Rx from "rxjs";

import DiscoveryAgent from './DiscoveryAgent'
import { PixelController } from "./PixelController";
import Util from './Util'

class Restore {
  private discoveryAgent: DiscoveryAgent;

  readPatternFromFile(dir: string, name: string, content: string): void {
    const path = Util.getPatternPath(dir, name);
    Util.vLog(`Restore.writePatternToFile: Writing pattern '${ name }' to path '${ path }'`);
    if (content[-1] !== "\n") {
      content = `${ content }\n`;
    }
    fs.writeFileSync(path, content);
  }

  restorePattern(dir: string, id: string, name: string, controller: PixelController): void {
    Util.vLog('Restore.restorePattern: backing up', id, name);
    const pattern = controller.patternList.getByName(name);
    if (!pattern) {
      throw new Error(`ERROR: Restore.restorePattern: Pattern '${ name }' does not exist on controller '${ controller.config.name }'`);
    }
    const content = pattern.code;
    // write pattern to file
    this.readPatternFromFile(dir, name, content);
  }

  // checks the root directory to ensure it exists, and creates the subdir for the Pixelblaze
  // returns the restore dir
  checkDir(rootDir: string, pbName: string): string {
    if (!fs.existsSync(rootDir)) {
      // ensure directory exists
      throw `ERROR: Dir '${ rootDir }' does not exist`;
    }

    const restoreDir = `${ rootDir }/${ pbName }`;
    try {
      fs.mkdirSync(restoreDir);
    } catch (e) {
      if (e.code === 'EEXIST') {
        Util.vLog(`Restore.checkDir: Dir '${ restoreDir }' already exists`);
      } else {
        throw e;
      }
    }
    return restoreDir;
  }

  // Restore all patterns from one pixelblaze directory to a pixelblaze controller
  restorePatterns() {

  }

  // run(fromName: string, toName: string, dir: string): Rx.Observable<null> {
  //   // read the file
  //
  //
  //   // send file to pixelblaze
  //   // easy, right?
  // }
}

module.exports = {Restore};

