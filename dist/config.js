// src/config.js
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from a .env file
// Helper function to get environment variables
const getEnv = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value || defaultValue;
};
// Helper function to get numeric environment variables
const getEnvNumber = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value ? Number(value) : defaultValue;
};
// Construct the strongly typed config object
export const config = {
    kafka: {
        clientId: getEnv('KAFKA_CLIENT_ID', 'podcast-service'),
        brokers: getEnv('KAFKA_BROKERS', 'localhost:9092').split(','),
        groupId: getEnv('KAFKA_GROUP_ID', 'podcast-consumer-group'),
        topics: {
            request: getEnv('KAFKA_REQUEST_TOPIC', 'podcast_requests'),
            response: getEnv('KAFKA_RESPONSE_TOPIC', 'podcast_responses'),
        },
    },
    rabbitmq: {
        url: getEnv('RABBITMQ_URL', 'amqp://localhost'),
        taskQueue: getEnv('RABBITMQ_TASK_QUEUE', 'podcast_task_queue'),
        prefetch: getEnvNumber('RABBITMQ_PREFETCH', 5), // Increase concurrency
    },
    server: {
        port: getEnvNumber('SERVER_PORT', 8080),
    },
    minio: {
        endpoint: getEnv('MINIO_ENDPOINT', 'minio.local'),
        port: getEnvNumber('MINIO_PORT', 9000),
        accessKey: getEnv('MINIO_ROOT_USER', 'podcast_admin'),
        secretKey: getEnv('MINIO_ROOT_PASSWORD', 'supersecurepassword'),
        useSSL: getEnv('MINIO_USE_SSL', 'false') === 'true',
        bucketName: getEnv('MINIO_BUCKET_NAME', 'podcast-bucket'),
    },
};
