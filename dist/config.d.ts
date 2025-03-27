interface KafkaTopics {
    request: string;
    response: string;
}
interface KafkaConfig {
    clientId: string;
    brokers: string[];
    groupId: string;
    topics: KafkaTopics;
}
interface RabbitMQConfig {
    url: string;
    taskQueue: string;
    prefetch: number;
}
interface ServerConfig {
    port: number;
}
interface MinioConfig {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
    bucketName: string;
}
interface AppConfig {
    kafka: KafkaConfig;
    rabbitmq: RabbitMQConfig;
    server: ServerConfig;
    minio: MinioConfig;
}
export declare const config: AppConfig;
export {};
