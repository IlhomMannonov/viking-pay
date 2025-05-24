// send.js
import amqp, {ChannelModel, ConsumeMessage} from "amqplib";
import {Channel} from "node:diagnostics_channel";
import logger from "../config/logger";

export class RabbitMQService {
    private url: string;
    private connection: ChannelModel | null = null;
    private channel: any;

    constructor(url: string) {
        this.url = url;
    }

    private async connect(): Promise<void> {
        this.connection = await amqp.connect(this.url); // Ulanish faqat bir marta
        this.channel = await this.connection.createChannel(); // Kanalni faqat bir marta yaratish
        console.log('Connected MQ');
    }

    public async sendToQueue(queueName: string, message: string): Promise<void> {
        await this.connect();
        if (!this.channel) throw new Error('Channel is not available');
        await this.channel.assertQueue(queueName, {durable: true});
        this.channel.sendToQueue(queueName, Buffer.from(message));

        logger.info(`Queuega malumot yuklandi: "${message}" → ${queueName}`)
    }

    public async consumeFromQueue(queueName: string, onMessage: (msg: string) => void): Promise<void> {
        await this.connect();
        if (!this.channel) throw new Error('Channel is not available');

        await this.channel.assertQueue(queueName, {durable: true});

        // Doimiy ravishda xabarni tinglash
        await this.channel.consume(queueName, (msg: ConsumeMessage | null) => {
            if (msg) {
                const content = msg.content.toString();
                onMessage(content);  // Xabarni ishlash
                this.channel!.ack(msg);  // Xabarni tasdiqlash
            }
        }, {noAck: false});  // Ack orqali xabarni qabul qilish
    }

    public async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        console.log('🔌 Ulanish yopildi');
    }

}

