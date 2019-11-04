import { Observable } from "rxjs";
import DiscoveryAgent from "./DiscoveryAgent";
import { PixelController } from "./PixelController";
import * as Rx from 'rxjs';

export default class ListCommand {
  private discoveryAgent: DiscoveryAgent;

  run(): Observable<number> {
    this.discoveryAgent = new DiscoveryAgent;
    this.discoveryAgent.start();

    console.log('Discovering Pixelblazes for 60s');

    this.discoveryAgent.subscribeToPixelblazes((controller: PixelController) => {
      console.log(`- ${ controller.config.name } (${ controller.address })`)
    });

    return Rx.timer(60 * 1000);
  }
}
