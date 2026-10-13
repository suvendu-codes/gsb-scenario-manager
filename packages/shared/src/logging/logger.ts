class Logger {
  logs: { message: string; timestamp: string }[] = [];

  get count() {
    return this.logs.length;
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    this.logs.push({ message, timestamp });
    console.log(`${timestamp} - ${message}`);
  }
}

export default new Logger();
