// Restore patterns to a device

import fs from "fs";
import { from, Observable, observable } from "rxjs";
import * as Rx from "rxjs";
import * as _ from 'lodash';
import * as RxOp from "rxjs/operators";

import DiscoveryAgent from './DiscoveryAgent'
import { IPartialPatternData, IPatternData } from "./IPatternData";
import { PixelController } from "./PixelController";
import Util from './Util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('RestoreCommand');

interface PbMetadata {
  pixelBlazeId: number;
  pixelBlazeName: string;
  programList: Array<IPatternData>;
}

export default class RestoreCommand {
  private discoveryAgent: DiscoveryAgent;
  private _observer: Rx.Observable<unknown>;

  constructor() {
    this.discoveryAgent = new DiscoveryAgent();
    this._observer = new Observable(); // unused, overridden later.  required to be initialized by ts strict mode
  }

  readPatternFromFile(dir: string, name: string, content: string): void {
    const path = Util.getPatternPath(dir, name);
    debug(`Restore.writePatternToFile: Writing pattern '${ name }' to path '${ path }'`);
    if (content[-1] !== "\n") {
      content = `${ content }\n`;
    }
    fs.writeFileSync(path, content);
  }

  restorePattern(patternContent: string, patternId: string, patternName: string, toController: PixelController | null): Rx.Observable<IPatternData> {
    console.log('RestoreCommand.restorePattern', patternId, patternContent)

    // compile the pattern, and create the data in the format expected by pb

    return new Observable((observer) => {
      console.log('Restored Pattern: Do nothing')
    })
  }

  loadMetadata(path: string): PbMetadata {
    const metadataPath = `${ path }/metadata.json`;
    const res = JSON.parse(fs.readFileSync(metadataPath).toString());
    // do some basic checking probly

    if (res.programList == null) {
      throw new Error("ERROR: RestoreCommand.loadMetadata: Malformed metadata does not include key 'programList'")
    }

    return res;
  }

  // Creates a stream that emits an event when we have fetched all sources for all patterns
  // persistPatterns(): Rx.Observable<Array<IPatternData>> {
  //   return this.programsList$.pipe(
  //     RxOp.flatMap((x: Array<IPartialPatternData>) => x),
  //     RxOp.concatMap(({ id, name }: IPartialPatternData) => {
  //       return this.requestSources(id, name).pipe(RxOp.delay(10)); // delay the requests a bit to avoid overloading pixelblaze
  //     }),
  //     RxOp.reduce((result: Array<IPatternData>, sourceData: IPatternData) => {
  //       result.push(sourceData);
  //       return result;
  //     }, []),
  //     RxOp.shareReplay(1),
  //   );
  // }

  // Restore all patterns from one pixelblaze directory to a pixelblaze controller
  restorePatterns(dir: string, fromName: string, toController: PixelController | null) {
    // persist one file at a time

    const pbDataDir = this.checkDir(dir, fromName);
    const metadata = this.loadMetadata(pbDataDir);

    // first, load the list of patterns to persist (and metadata)
    const paths: Array<string> = fs.readdirSync(pbDataDir).map((file: string) => {
      return `${ pbDataDir }/${ file }`
    });

    const obs = Rx.from(metadata.programList).pipe(
      // RxOp.flatMap((x: Array<IPartialPatternData>) => x),
      RxOp.concatMap((patternEntry: IPatternData) => {
        console.log('loading pattern: ', patternEntry.id, patternEntry.name);
        // for now just generate the path
        const patternPath: string = Util.getPatternPath(pbDataDir, patternEntry.name);
        //
        const patternContent: string = fs.readFileSync(patternPath).toString();
        return this.restorePattern(patternContent, patternEntry.id, patternEntry.name, toController)
      }),
      RxOp.reduce((result: Array<IPatternData>, sourceData: IPatternData) => {
        console.log('RestoreCommand.reduce')
        result.push(sourceData);
        return result;
      }, []),
    );

    obs.subscribe((someResult: Array<IPatternData>) => {
      console.log('subscribed to obs', someResult)
    })

    return obs;


    // paths.forEach(() => {
    //   // read file content
    //   const patternContent = '';
    //
    //   return this.restorePattern(patternContent, patternId, patternName, toController)
    // })
    //


  }

  run(fromName: string, toName: string, dir: string): Rx.Observable<any> {
    // const fn = () => {
    //
    // }

    console.log(`Restoring saved patterns from PB '${ fromName }' to '${ toName }'`);
    return this.restorePatterns(dir, fromName, null);
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
      throw `ERROR: Data directory for PB '${ pbName }' does not exist at '${ restoreDir }'`;
    }

    return restoreDir;
  }
}
