declare enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}
declare class CorrelationTracker {
    private pendingCorrelations;
    private waitingResolvers;
    private logLevel;
    setLogLevel(level: LogLevel): void;
    private log;
    waitForAll(correlationIds: string[]): Promise<void>;
    markCompleted(correlationId: string): void;
}
export { CorrelationTracker, LogLevel };
