/**
 * Мы имеем жесткую зависимость от пакета reflect-metadata. Без него
 * поиск зависимостей не будет работать, поэтому мы предупреждаем пользователей,
 * когда он не загружен.
 */
import 'reflect-metadata'
import { ContextComponent } from './decorators/ContextComponent'
import { ContainerRegistry } from './ContainerRegistry'

if (!Reflect || !(Reflect as any).getMetadata) {
  throw new Error(
    'TypeDI requires "Reflect.getMetadata" to work. Please import the "reflect-metadata" package at the very first line of your application.',
  )
}

export * from './decorators/ContextInjectMany'
export * from './decorators/ContextInject'

export * from './error/CannotInstantiateValueError'
export * from './error/CannotInjectValueError'
export * from './error/ContextComponentNotFoundError'

export { Handler } from './interfaces/Handler'
export { ServiceMetadata } from './interfaces/ServiceMetadata'
export { ServiceOptions } from './interfaces/ServiceOptions'
export { Constructable } from './types/Constructable'
export { ContextComponentIdentifier } from './types/ContextComponentIdentifier'

export * from './support'

export { ContainerInstance } from './ContainerInstance'
export { Token } from './Token'

/** We export the default container under the Container alias. */
export const Container = ContainerRegistry.defaultContainer

export { ContextComponent }

export const Service = ContextComponent()
export const Component = ContextComponent()
export const Autowire = ContextComponent()
