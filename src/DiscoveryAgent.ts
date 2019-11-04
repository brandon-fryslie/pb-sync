import dgram, { Socket } from 'dgram'

import * as Rx from 'rxjs'
import * as RxOp from 'rxjs/operators'
import Util from './Util'
import { PixelController } from './PixelController'
import { Observable } from "rxjs";
import { AddressInfo } from "net";

interface IDgramMsgMetadata {
  address: string;
  family: string;
  port: number;
  size: number;
}

interface IDgramMsg {
  msg: Buffer;
  metadata: IDgramMsgMetadata;
  senderId?: number;
}

export default class DiscoveryAgent {
  private controllers: {};
  private server: Socket;
  private serverListening$: Observable<undefined>;
  private serverMessage$: Observable<IDgramMsg>;
  private _discovery$: Observable<PixelController>;

  static PACKET_TYPES = {
    BEACONPACKET: 42,
    TIMESYNC: 43
  };

  constructor() {
    this.controllers = {};
  }

  get discovery$(): Observable<PixelController> {
    return this._discovery$
  }

  start(): void {
    //    @discovery.start host: '0.0.0.0', port: 1889
    return this.createServer();
  }

  private createServer(opts: { port: number; host: string } = { port: null, host: null }): void {
    const host = opts.host ? opts.host : '0.0.0.0';
    const port = opts.port ? opts.port : 1889;

    this.server = dgram.createSocket('udp4');
    this.serverListening$ = Rx.fromEvent(this.server, 'listening');
    this.serverMessage$ = Rx.fromEvent(this.server, 'message').pipe(
      RxOp.map(([ msg, metadata ]: [ Buffer, IDgramMsgMetadata ]) => ({ msg: msg, metadata: metadata }))
    );

    this.serverListening$.subscribe((/* a: undefined */) => {
      console.log(`DiscoveryAgent.createServer: Autodiscovery server listening on ${ ((this.server.address() as AddressInfo).address) }:${ ((this.server.address() as AddressInfo).port) }`);
    });

    this._discovery$ = this.createDiscovery$();
    this.server.bind(port, host);
  }

  createDiscovery$(): Rx.Observable<PixelController> {
    return this.serverMessage$.pipe(
      RxOp.filter(({ msg }: IDgramMsg) => msg.readUInt32LE(0) === DiscoveryAgent.PACKET_TYPES.BEACONPACKET),
      RxOp.map(({ msg, metadata }: IDgramMsg) => ({ msg, metadata, senderId: msg.readUInt32LE(4) })), /* transform to an object and store the senderId*/
      RxOp.distinct((obj: IDgramMsg) => obj.metadata.address), /* only emit one event per sender id*/
      RxOp.map(({ senderId, metadata }: IDgramMsg) => {
        if (!this.controllers[senderId]) {
          this.controllers[senderId] = new PixelController(senderId, metadata.address);
        }
        return this.controllers[senderId];
      }),
      RxOp.tap((controller: PixelController) => {
        Util.vLog(`DiscoveryAgent: PixelController object created for ${ controller.address }.  Waiting for it to become ready...`)
      }),
      RxOp.flatMap((controller: PixelController) => controller.ready$())
    );
  }

  public subscribeToPixelblazes(fn: Function): Rx.Subscription {
    return this._discovery$.subscribe(o => fn(o))
  }

  // need this for now to prevent the whole thing from blowing up
  waitForPixelBlaze$(name: string): Rx.Observable<PixelController> {
    Util.vLog(`DiscoveryAgent.waitForPixelBlaze: Waiting for Pixelblaze '${ name }' to become ready`);
    return this._discovery$.pipe(
      RxOp.filter((controller: PixelController) => controller.config.name === name),
      RxOp.tap(controller => console.log(`waitForPixelBlaze: Pixelblaze '${ name }' at ${ controller.address } is ready`))
    );
  }
}
