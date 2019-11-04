import _ from "lodash";
import { Observable } from "rxjs";
import WebSocket, { CloseEvent, ErrorEvent, OpenEvent } from "ws";
import EventEmitter from "events";
import LZString from "lz-string";
import * as Rx from "rxjs";
import * as RxOp from "rxjs/operators";

import * as Constants from './Constants'
import { IPatternData, IPartialPatternData } from "./IPatternData";

const PacketType = Constants.PacketType;
const PacketFrameFlags = Constants.PacketFrameFlags;
import PatternList from "./PatternList";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require('debug')('PixelController');

// Implements the functionality necessary to interact with Pixelblaze
// Missing the 'lastSeen' functionality from the original controller.js

interface IPixelControllerConfig {
  name: string;
  pixelCount: number;
  brightness: number;
  colorOrder: string;
  dataSpeed: number;
  ledType: number;
  sequenceTimer: 120;
  sequencerEnable: boolean;
  exp: number;
  ver: string;
}

interface IPbFrame {
  getConfig?: boolean;
  listPrograms?: boolean;
  sendUpdates?: boolean;
  getSources?: string;
}

export class PixelController extends EventEmitter {
  private _id: number;
  private _address: string;
  private _patternList: PatternList;
  private _config: IPixelControllerConfig;

  private ws: WebSocket;
  private wsOpen$: Rx.Observable<OpenEvent>;
  private wsError$: Rx.Observable<ErrorEvent>;
  private wsClose$: Rx.Observable<CloseEvent>;

  private wsMessage$: Rx.Observable<ArrayBuffer>;
  private controllerConfig$: Rx.Observable<IPixelControllerConfig>;
  private binaryPacket$: Rx.Observable<Uint8Array>;
  private sourcesData$: Rx.Observable<Uint8Array>;
  private programsList$: Rx.Observable<Array<IPartialPatternData>>;
  private sourcesList$: Rx.Observable<Array<IPatternData>>;
  private unknownPacket$: Rx.Observable<Uint8Array>;

  constructor(id, address) {
    super();
    this._id = id;
    this._address = address;
    this._patternList = new PatternList;
    this.connect();
  }

  get id(): number {
    return this._id
  }

  get patternList(): PatternList {
    return this._patternList
  }

  get config(): IPixelControllerConfig {
    return this._config
  }

  get address(): string {
    return this._address
  }

  stop(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      this.ws.terminate();
    }
  }

  connect(): void {
    this.stop();
    this.ws = new WebSocket(`ws://${ this.address }:81`);
    this.ws.binaryType = 'arraybuffer';

    // I am probably not cleaning something up correctly
    this.ws.setMaxListeners(25);

    this.wsOpen$ = this.createWsOpen$();
    this.wsOpen$.subscribe(() => {
      this.sendFrame({ getConfig: true, listPrograms: true, sendUpdates: false });
    });

    this.wsError$ = Rx.fromEvent(this.ws, 'error');
    this.wsClose$ = Rx.fromEvent(this.ws, 'close').pipe(
      RxOp.map((e: CloseEvent) => e),
      RxOp.take(1),
    );

    // Subscribe to these streams and log events, but they aren't used right now
    this.wsClose$.subscribe(((...args) => {
      console.log('Got close message: ', args);
    }), ((...args) => {
      console.log('Close error:', args);
    }), ((...args) => {
      console.log('Close complete:', args);
    }));

    this.wsError$.subscribe(((...args) => {
      console.log('Got ws error event message: ', args);
    }), ((...args) => {
      console.log('error error:', args);
    }), ((...args) => {
      console.log('error complete:', args);
    }));

    // Create streams for handling various forms of data from the controller
    this.wsMessage$ = Rx.fromEvent(this.ws, 'message').pipe(
      RxOp.map(({ data }: { target: WebSocket; type: string; data: ArrayBuffer }) => data),
    );

    this.controllerConfig$ = this.createControllerConfig$();
    this.binaryPacket$ = this.createBinaryPacket$();

    this.sourcesData$ = this.binaryPacket$.pipe(RxOp.filter(data => data[0] === PacketType.SOURCESDATA));

    const previewFramePacketStream = this.binaryPacket$.pipe(RxOp.filter(data => data[0] === PacketType.PREVIEWFRAME)); // unused
    const thumbnailStream = this.binaryPacket$.pipe(RxOp.filter(data => data[0] === PacketType.THUMBNAILJPG)); // unused

    this.programsList$ = this.createProgramList$();
    this.sourcesList$ = this.createSourcesList$();

    // Update config and sources list when they have been fetched
    this.controllerConfig$.subscribe((config: IPixelControllerConfig) => {
      debug('PixelController: controllerConfig updated');
      this._config = config;
    });

    this.sourcesList$.subscribe((allSources: Array<IPatternData>) => {
      debug('PixelController: sourcesList updated');
      this.patternList.addAll(allSources);
    });

    // Let us know if we get some sort of known packet type so we can handle it properly
    this.unknownPacket$ = this.binaryPacket$.pipe(
      RxOp.filter((data: Uint8Array) => data[0] === _.includes(Object.values(PacketType), data[0]))
    );
    this.unknownPacket$.subscribe(data => console.log(`PixelController: Unknown PacketType: ${ data[0] }`));
  }

  createWsOpen$(): Rx.Observable<OpenEvent> {
    return Rx.fromEvent(this.ws, 'open').pipe(
      RxOp.map((e: OpenEvent) => e),
      RxOp.take(1),
      RxOp.tap(() => {
        debug(`PixelController: Websocket connected to ${ this.address }`);
      }),
    )
  }

  // Creates a stream that emits an event when the controller sends us the config.  Parse the json and emit the result
  createControllerConfig$(): Rx.Observable<IPixelControllerConfig> {
    return this.wsMessage$.pipe(
      RxOp.filter((data: string | ArrayBuffer) => typeof data == 'string'),
      RxOp.map((data: string) => JSON.parse(data)),
      RxOp.first(),
    );
  }

  // Creates a stream that emits an event when the controller sends us a binary data packet
  // All other data other than the config are in binary packets
  createBinaryPacket$(): Rx.Observable<Uint8Array> {
    return this.wsMessage$.pipe(
      RxOp.filter((data: string | ArrayBuffer) => data instanceof ArrayBuffer),
      RxOp.map((data: ArrayBuffer) => new Uint8Array(data)),
      RxOp.filter((data: Uint8Array) => data.length > 0),
    );
  }

  // Creates a stream that emits an event when we have fetched all sources for all patterns
  createSourcesList$(): Rx.Observable<Array<IPatternData>> {
    return this.programsList$.pipe(
      RxOp.flatMap((x: Array<IPartialPatternData>) => x),
      RxOp.concatMap(({ id, name }: IPartialPatternData) => {
        return this.requestSources(id, name).pipe(RxOp.delay(10)); // delay the requests a bit to avoid overloading pixelblaze
      }),
      RxOp.reduce((result: Array<IPatternData>, sourceData: IPatternData) => {
        result.push(sourceData);
        return result;
      }, []),
      RxOp.shareReplay(1),
    );
  }

  // Creates a stream that emits an event when the controller is 'ready'
  // When both the config and the list of programs and sources have been fetched, we are ready
  ready$(): Rx.Observable<this> {
    return Rx.zip(
      // this.createControllerConfig$(),
      this.controllerConfig$,
      // this.createSourcesList$(),
      this.sourcesList$,
    ).pipe(
      RxOp.mapTo(this)
    ); // return the controller object itself
  }

  // Convert the program list from an arraybuffer to a list of objects of shape: { id: <pattern id>, name: <pattern name> }
  convertBinaryProgramListToStr(data: ArrayBuffer): Array<IPartialPatternData> {
    const dataStr = Buffer.from(data).toString('utf8');
    return _(dataStr.split("\n"))
      .filter((line: string) => line !== '')
      .map((line: string) => line.split("\t"))
      .map((val: [ string, string ]) => ({ id: val[0], name: val[1] })).value();
  }

  // Creates a stream that emits an event when we have gotten the full program list from the controller
  createProgramList$(): Rx.Observable<Array<IPartialPatternData>> {
    const rawProgramList$ = this.binaryPacket$.pipe(RxOp.filter((buf: ArrayBuffer) => buf[0] === PacketType.PROGRAMLIST));

    // these turned out not to be necessary
    const programListStart$ = rawProgramList$.pipe(RxOp.filter((buf: ArrayBuffer) => Boolean(buf[1] & PacketFrameFlags.START)));
    const programListContinue$ = rawProgramList$.pipe(RxOp.filter((buf: ArrayBuffer) => Boolean(buf[1] & PacketFrameFlags.CONTINUE)));
    const programListEnd$ = rawProgramList$.pipe(RxOp.filter((buf: ArrayBuffer) => Boolean(buf[1] & PacketFrameFlags.END)));

    // Dunno how to reduce this whole thing into a map of composed streams just yet, but its working
    return rawProgramList$.pipe(
      RxOp.takeWhile(((buf: ArrayBuffer) => !(buf[1] & PacketFrameFlags.END))),
      RxOp.reduce((result: Array<IPartialPatternData>, buf: ArrayBuffer) => {
        // First byte if buf is the type of packet (PROGRAMLIST in this case), second byte is the type of PROGRAMLIST packet
        const inProgressList = this.convertBinaryProgramListToStr(buf.slice(2));
        return result.concat(inProgressList);
      }, []),
      RxOp.shareReplay(1),
    );
  }

  // Creates a stream that emits an event when we've received the source code for the pattern specified by the 'id' parameter
  requestSources(id: string, name: string): Observable<IPatternData> {
    this.sendFrame({ getSources: id });
    return this.sourcesData$.pipe(
      RxOp.takeWhile(((buf: Uint8Array) => !(buf[1] & PacketFrameFlags.END)), true),
      RxOp.reduce((result: Uint8Array, buf: Uint8Array) => {
        return Buffer.concat([ result, buf.slice(2) ]);
      }, Buffer.from([])),
      RxOp.map((buf: Buffer) => {
        const parsed = JSON.parse(LZString.decompressFromUint8Array(buf));

        const unexpectedKeys: Array<string> = _(parsed).keys().filter((k) => k != 'main').value();

        if (unexpectedKeys.length > 0) {
          // if there's ever a key besides 'main', we wanna know about it
          throw new Error(`ERROR: Unknown key(s) in parsed sourcesData: ${ unexpectedKeys.join(', ') }`);
        }

        if (!parsed.main) {
          // if we don't have a 'main' property, throw an error
          throw new Error(`ERROR: No data found in parsed sourcesData: ${ parsed }`);
        }

        return parsed.main;
      }),
      // keep track of the pattern's name and id that this code belongs to
      RxOp.map((code: string) => ({ id, name, code }))
    );
  }

  sendFrame(frame: IPbFrame): void {
    debug("PixelController: sending frame", frame);
    const jsonFrame = JSON.stringify(frame);
    const isDisconnected = this.ws && this.ws.readyState !== this.ws.OPEN;
    if (isDisconnected) {
      console.log('PixelController: Sent packet to disconnected websocket');
      return;
    }
    this.ws.send(jsonFrame);
  }

}
