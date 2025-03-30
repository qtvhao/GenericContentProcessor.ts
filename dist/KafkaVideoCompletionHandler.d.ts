export declare class KafkaVideoCompletionHandler {
    private correlationTracker;
    private isConsumerStarted;
    constructor();
    private startConsumer;
    waitForVideoCompletions(correlationIds: string[], outputFilePaths: string[]): Promise<void>;
    private buildCorrelationMap;
}
