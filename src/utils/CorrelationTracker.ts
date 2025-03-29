enum LogLevel {
    NONE,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}

class CorrelationTracker {
    private pendingCorrelations: Map<string, boolean> = new Map();
    private waitingResolvers: { ids: string[]; resolve: () => void }[] = [];
    private logLevel: LogLevel = LogLevel.NONE;

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    private log(level: LogLevel, message: string): void {
        if (level <= this.logLevel) {
            console.log(`[${LogLevel[level]}] ${message}`);
        }
    }

    async waitForAll(correlationIds: string[]): Promise<void> {
        const isAllCompleted = correlationIds.every(id => this.pendingCorrelations.get(id) === true);

        if (isAllCompleted) {
            this.log(LogLevel.INFO, `All correlation IDs already completed: ${correlationIds.join(', ')}`);
            return;
        }

        for (const id of correlationIds) {
            if (!this.pendingCorrelations.has(id)) {
                this.pendingCorrelations.set(id, false);
            }
        }

        this.log(LogLevel.DEBUG, `Waiting for IDs: ${correlationIds.join(', ')}`);

        return new Promise<void>(resolve => {
            this.waitingResolvers.push({ ids: correlationIds, resolve });
        });
    }

    markCompleted(correlationId: string): void {
        this.pendingCorrelations.set(correlationId, true);
        this.log(LogLevel.INFO, `Marked completed: ${correlationId}`);

        for (const { ids, resolve } of [...this.waitingResolvers]) {
            const allDone = ids.every(id => this.pendingCorrelations.get(id) === true);
            if (allDone) {
                resolve();
                this.log(LogLevel.DEBUG, `Resolved waiting callback for: ${ids.join(', ')}`);
                this.waitingResolvers = this.waitingResolvers.filter(r => r.resolve !== resolve);
            }
        }
    }
}

export { CorrelationTracker, LogLevel };
