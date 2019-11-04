// Restore patterns to a device

import fs from "fs";
import { from, observable } from "rxjs";
import * as Rx from "rxjs";



import DiscoveryAgent from './DiscoveryAgent'
import { PixelController } from "./PixelController";
import Util from './Util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('RestoreCommand');

export default class RestoreCommand {
  private discoveryAgent: DiscoveryAgent;

  readPatternFromFile(dir: string, name: string, content: string): void {
    const path = Util.getPatternPath(dir, name);
    debug(`Restore.writePatternToFile: Writing pattern '${ name }' to path '${ path }'`);
    if (content[-1] !== "\n") {
      content = `${ content }\n`;
    }
    fs.writeFileSync(path, content);
  }

  restorePattern(dir: string, id: string, name: string, controller: PixelController): void {
    debug('Restore.restorePattern: backing up', id, name);
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
      throw `ERROR: Root pb-sync directory '${ rootDir }' does not exist`;
    }

    const restoreDir = `${ rootDir }/${ pbName }`;
    if (!fs.existsSync(restoreDir)) {
      // ensure directory exists
      throw `ERROR: Data directory for PB '${ pbName }' does not exist at '${restoreDir}'`;
    }

    return restoreDir;
  }

  // Restore all patterns from one pixelblaze directory to a pixelblaze controller
  restorePatterns(fromName: string, toController: PixelController, dir: string, observer: Rx.Observer<void>) {
    // persist one file at a time

    const pbDataDir = this.checkDir(dir, fromName);

    // first, load the list of patterns to persist (and metadata)
    fs.readdirSync(pbDataDir).forEach(file => {
      console.log('read file from data dir:', file);
      console.log(file);
    });



  }

  run(fromName: string, toName: string, dir: string): Rx.Observable<null> {
    return new Rx.Observable((observer) => {
      // read the files
      // send files to pixelblaze
      // easy, right?

      console.log(`Restoring saved patterns from PB '${fromName}' to '${toName}'`);

      this.discoveryAgent = new DiscoveryAgent;
      this.discoveryAgent.start();

      this.discoveryAgent.waitForPixelBlaze$(toName).subscribe((toController: PixelController) => {
        this.restorePatterns(fromName, toController, dir, observer);
      });
    });
  }
}
