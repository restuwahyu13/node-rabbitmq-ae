# RABBITMQ AE (Alternate Exchange)

Check this tutorial about alternate exchange using **rabbitmq** [here](https://www.rabbitmq.com/ae.html), if you need tutorial about rabbitmq check my repo [here](https://github.com/restuwahyu13/node-rabbitmq).

## Server Alternate Exchange

```ts
import { RabbitMQ } from './rabbitmq'

const rabbitmq: InstanceType<typeof RabbitMQ> = new RabbitMQ()
rabbitmq.consumerAe('users')

process.on('SIGINT', function () {
  console.log(`Terminated process: ${process.pid} successfully`)
  process.exit(0)
})

setInterval(() => console.log('...........................'), 3000)
```

## Client Alternate Exchange

```ts
import { faker } from '@faker-js/faker'
import { RabbitMQ } from './rabbitmq'

const requestData: Record<string, any> = {
  id: faker.datatype.uuid(),
  name: faker.name.fullName(),
  country: faker.address.country(),
  city: faker.address.city(),
  postcode: faker.address.zipCode()
}

const rabbitmq: InstanceType<typeof RabbitMQ> = new RabbitMQ()

rabbitmq.publishAe('users', requestData).then((value: any) => {
  console.log(`Publishing data success `, value)
})
```