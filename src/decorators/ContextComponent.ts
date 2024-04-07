import { ContainerRegistry } from '../ContainerRegistry'
import { EMPTY_VALUE } from '../const'
import { Constructable } from '../types/Constructable'
import { ServiceMetadata } from '../interfaces/ServiceMetadata'
import { ServiceOptions } from '../interfaces/ServiceOptions'

/**
 * Отмечает класс как сервис, который может быть внедрен с использованием контейнера.
 * @constructor
 */
export function ContextComponent<T = unknown>(): Function
export function ContextComponent<T = unknown>(options: ServiceOptions<T>): Function
export function ContextComponent<T>(options: ServiceOptions<T> = {}): ClassDecorator {
  return targetConstructor => {
    const serviceMetadata: ServiceMetadata<T> = {
      id: options.id || targetConstructor,
      type: targetConstructor as unknown as Constructable<T>,
      factory: (options as any).factory || undefined,
      multiple: options.multiple || false,
      eager: options.eager || false,
      scope: options.scope || 'container',
      referencedBy: new Map().set(ContainerRegistry.defaultContainer.id, ContainerRegistry.defaultContainer),
      value: EMPTY_VALUE,
    }

    ContainerRegistry.defaultContainer.set(serviceMetadata)
  }
}
