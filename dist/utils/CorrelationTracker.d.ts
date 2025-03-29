type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export declare class CorrelationTracker {
    private tasks;
    private logLevel;
    setLogLevel(level: LogLevel): void;
    waitForAll(correlationIds: string[], resolve: () => void): void;
    markCompleted(correlationId: string): void;
    private printTasks;
    private log;
}
export {};
