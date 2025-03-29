var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NONE"] = 0] = "NONE";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel || (LogLevel = {}));
class CorrelationTracker {
    pendingCorrelations = new Map();
    waitingResolvers = [];
    logLevel = LogLevel.NONE;
    setLogLevel(level) {
        this.logLevel = level;
    }
    log(level, message) {
        if (level <= this.logLevel) {
            console.log(`[${LogLevel[level]}] ${message}`);
        }
    }
    async waitForAll(correlationIds) {
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
        return new Promise(resolve => {
            this.waitingResolvers.push({ ids: correlationIds, resolve });
        });
    }
    markCompleted(correlationId) {
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
