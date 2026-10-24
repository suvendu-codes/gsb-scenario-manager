export interface EventMessage {
  topic: string;
  partition: number;
  message: { offset: string; value: Buffer | null };
}

/** Kafka client seam shared by KafkaJS and the mock. Only adapters use this API. */
export interface EventConsumer {
  connect(): Promise<void>;
  subscribe(options: { topics: string[]; fromBeginning: boolean }): Promise<void>;
  run(options: { autoCommit: false; eachMessage: (event: EventMessage) => Promise<void> }): Promise<void>;
  commitOffsets(offsets: { topic: string; partition: number; offset: string }[]): Promise<void>;
  stop(): Promise<void>;
  disconnect(): Promise<void>;
}
