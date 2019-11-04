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

  getPatternPath(dir: string, name: string): string {
    // pick a good filename
    const extension = "epe";
    const filename = name.replace(/[^\w]/g, '_');
    return `${ dir }/${ filename }.${ extension }`;
  }
}

export default new Util()
