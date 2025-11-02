/** Simple logger implementation */
export class Logger {
  private logger: { log: (level: string, message: string) => void } | null =
    null;

  constructor(private debug: boolean) {
    if (this.debug) {
      this.logger = {
        log: (level: string, message: string) => {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        },
      };
    }
  }

  /** Log a message
   * @param message Message to log
   * @param level Log level */
  log(message: string, level: string = 'info'): void {
    if (this.debug && this.logger) {
      this.logger.log(level, `[NuboDB] ${message}`);
    }
  }
}

