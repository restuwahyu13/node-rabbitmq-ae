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
