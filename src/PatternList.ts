import _ from "lodash";
import { IPatternData } from "./IPatternData";

export default class PatternList {
  private items: Array<IPatternData>;

  constructor(items = []) {
    this.items = items;
  }

  getByName(name: string): IPatternData {
    return _.find(this.items, function (item) {
      return item.name === name;
    });
  }

  addAll(items: Array<IPatternData>): void {
    this.items = this.items.concat(items);
  }

  getItems(): Array<IPatternData> {
    return this.items;
  }
}

