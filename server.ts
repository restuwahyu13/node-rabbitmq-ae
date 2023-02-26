import { RabbitMQ } from './rabbitmq'

const rabbitmq: InstanceType<typeof RabbitMQ> = new RabbitMQ()
rabbitmq.consumerAe('users')

process.on('SIGINT', function () {
  console.log(`Terminated process: ${process.pid} successfully`)
  process.exit(0)
})

setInterval(() => console.log('...........................'), 3000)
