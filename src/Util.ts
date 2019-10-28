import {args as ARGS} from "./CLI";

class Util {
  // verbose logging

  vLog(...strs): void {
    if (ARGS.verbose) {
      console.log(...strs)
    }
  }

  getTime(): Date {
    return new Date()
  }
}

export default new Util()
