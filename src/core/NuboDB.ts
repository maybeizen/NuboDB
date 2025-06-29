import { DatabaseOptions } from './types';

class NuboDB {
  private static instance: NuboDB;
  private options: DatabaseOptions;

  private constructor(options: DatabaseOptions) {
    this.options = options;
  }

  public static async getInstance() {
    return this.instance;
  }

  public async open() {}
}

export default NuboDB;
