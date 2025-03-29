type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class CorrelationTracker {
    private tasks: Array<{ pending: Set<string>; resolve: () => void }> = [];
    private logLevel: LogLevel = 'DEBUG';

    setLogLevel(level: LogLevel) {
        this.logLevel = level;
        this.log('INFO', `Log level set to ${level}`);
    }

    waitForAll(correlationIds: string[], resolve: () => void): void {
        const pendingSet = new Set(correlationIds);
        this.tasks.push({ pending: pendingSet, resolve });
        this.log('INFO', `🕒 Waiting for: ${Array.from(pendingSet).join(', ')}`);
        this.printTasks();
    }

    markCompleted(correlationId: string): void {
        this.log('INFO', `✅ Marking completed: ${correlationId}`);
        for (let i = this.tasks.length - 1; i >= 0; i--) {
            const task = this.tasks[i];
            if (task.pending.has(correlationId)) {
                task.pending.delete(correlationId);
                this.log('DEBUG', `🧹 Removed '${correlationId}' from task ${i}. Remaining: ${Array.from(task.pending).join(', ') || 'None'}`);
                if (task.pending.size === 0) {
                    this.log('INFO', `🎉 Task ${i} completed. Resolving...`);
                    task.resolve();
                    this.tasks.splice(i, 1);
                    this.log('DEBUG', `🗑️ Removed resolved task ${i}`);
                }
            }
        }
        this.printTasks();
    }

    private printTasks(): void {
        if (this.tasks.length === 0) {
            this.log('INFO', `📭 No pending tasks.`);
            return;
        }

        this.log('INFO', `📌 Current pending tasks (${this.tasks.length}):`);
        this.tasks.forEach((task, index) => {
            this.log('INFO', `   🔸 Task ${index}: [${Array.from(task.pending).join(', ') || 'Completed'}]`);
        });
    }

    private log(level: LogLevel, message: string): void {
        const levels: Record<LogLevel, number> = {
            'DEBUG': 0,
            'INFO': 1,
            'WARN': 2,
            'ERROR': 3
        };

        if (levels[level] >= levels[this.logLevel]) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level}] ${message}`);
        }
    }
}
