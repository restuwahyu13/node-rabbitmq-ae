import 'dotenv/config'
import rabbitmq, { Channel, Connection, ConsumeMessage, GetMessage, Replies } from 'amqplib'
import { nextTick } from 'process'
import delay from 'delay'
import { v4 as uuid } from 'uuid'

enum exchangeType {
  Direct = 'direct',
  Topic = 'topic',
  Fanout = 'fanout',
  Header = 'header'
}

export interface consumerAeResponse {
  readonly data: any
  resolve?: (value: any) => void
  reject?: (err: any) => void
}

export interface consumerOverwriteResponse {
  correlationId?: string
  replyTo?: string
  contentType?: string
  timestamp?: string
  data: Record<string, any> | any[]
}

interface IRabbitMQ {
  publishAe(queue: string, body: any): Promise<any>
  consumerAe(queue: string): Promise<void>
}

export class RabbitMQ implements IRabbitMQ {
  private url: string = ''
  private exchangeName: string = ''
  private exchangeNameAlt: string = ''
  private queueNameAlt: string = ''
  private uuid: string = ''
  private aeResponse: consumerAeResponse = {
    data: '',
    resolve: Promise.resolve,
    reject: Promise.reject
  }

  constructor() {
    this.url = process.env.AMQP_URL
    this.exchangeName = process.env.EXCHANGE_NAME
    this.exchangeNameAlt = process.env.EXCHANGE_NAME_ALT
    this.queueNameAlt = process.env.QUEUE_NAME_ALT
    this.uuid = uuid()
  }

  private async amqpConnection(): Promise<Connection> {
    try {
      const con: Connection = await rabbitmq.connect(this.url)
      if (!con) {
        console.error('AMQP client not connected')
        con.close()
      }

      return con
    } catch (err: any) {
      console.error(`AMQP client error: ${err.message}`)
      return Promise.reject(new Error(`AMQP client error: ${err.message}`))
    }
  }

  private async amqpChannel(con: Connection): Promise<Channel> {
    try {
      const channel: Channel = await con.createChannel()
      if (!channel) {
        console.error('AMQP channel not found')
        channel.close()
      }

      return channel
    } catch (err: any) {
      console.error(`AMQP channel error: ${err.message}`)
      return Promise.reject(new Error(`AMQP channel error: ${err.message}`))
    }
  }

  async publishAe(queue: string, body: any): Promise<any> {
    console.info('START PUBLISHER AE -> %s', queue)

    try {
      const con: Connection = await this.amqpConnection()
      const ch: Channel = await this.amqpChannel(con)

      const assertExchangeAlt: Replies.AssertExchange = await ch.assertExchange(this.exchangeNameAlt, exchangeType.Fanout, { durable: true })
      const assertExchange: Replies.AssertExchange = await ch.assertExchange(this.exchangeName, exchangeType.Direct, { durable: true, alternateExchange: this.exchangeNameAlt })

      await ch.bindExchange(assertExchangeAlt.exchange, assertExchangeAlt.exchange, queue)
      await ch.bindExchange(assertExchange.exchange, assertExchange.exchange, queue)

      const isPublish: boolean = await ch.sendToQueue(queue, Buffer.from(JSON.stringify(body)), { persistent: true, messageId: this.uuid })

      if (!isPublish) {
        console.error('Publishing data into queue failed: %v', isPublish)
        throw new Error(`Publishing data into queue failed: ${isPublish}`)
      }

      nextTick(async () => {
        await delay(10)
        con.close()
      })

      return Promise.resolve(true)
    } catch (err: any) {
      console.error(`Publisher error: ${err.message}`)
      return Promise.reject(`Publisher error: ${err.message}`)
    }
  }

  private async listeningConsumerAe(ch: Channel): Promise<void> {
    try {
      const assertExchangeAlt: Replies.AssertExchange = await ch.assertExchange(this.exchangeNameAlt, exchangeType.Fanout, { durable: true })
      const assertQueueAlt: Replies.AssertQueue = await ch.assertQueue(this.queueNameAlt, { durable: true })

      await ch.bindExchange(assertExchangeAlt.exchange, assertExchangeAlt.exchange, assertQueueAlt.queue)
      await ch.bindQueue(assertQueueAlt.queue, assertExchangeAlt.exchange, assertQueueAlt.queue)

      ch.consume(this.queueNameAlt, async (delivery: ConsumeMessage): Promise<void> => {
        console.info('UNDELIVERED CONSUMER AE BODY: ', delivery.content.toString())

        ch.reject(delivery, false)
      })
    } catch (err: any) {
      console.error(`Consumer error: ${err.message}`)
      Promise.reject(`Consumer error: ${err.message}`)
    }
  }

  async consumerAe(queue: string): Promise<any> {
    console.info('START TOPIC CONSUMER AE -> %s', queue)

    try {
      const con: Connection = await this.amqpConnection()
      const ch: Channel = await this.amqpChannel(con)

      await this.listeningConsumerAe(ch)

      const assertExchange: Replies.AssertExchange = await ch.assertExchange(this.exchangeName, exchangeType.Direct, { durable: true, alternateExchange: this.exchangeNameAlt })
      const assertQueue: Replies.AssertQueue = await ch.assertQueue(queue, { durable: true })

      await ch.bindExchange(assertExchange.exchange, assertExchange.exchange, assertQueue.queue)
      await ch.bindQueue(assertQueue.queue, assertExchange.exchange, queue)

      ch.consume(queue, async (delivery: ConsumeMessage): Promise<void> => {
        console.info('DELIVERED CONSUMER AE BODY: ', delivery.content.toString())

        this.aeResponse.resolve(delivery.content.toString())
        ch.ack(delivery)
      })

      return new Promise((resolve: (value: any) => void, reject: (err: any) => void): void => {
        this.aeResponse.resolve = resolve
        this.aeResponse.reject = reject
      })
    } catch (err: any) {
      console.error(`Consumer error: ${err.message}`)
      return Promise.reject(`Consumer error: ${err.message}`)
    }
  }
}
