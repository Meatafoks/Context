import { ContainerInstance } from './ContainerInstance'
import { ContainerIdentifier } from './types/ContainerIdentifier'

/**
 * Реестр контейнеров отвечает за хранение контейнера по умолчанию и каждого
 * созданного экземпляра контейнера для последующего доступа.
 *
 * _Примечание: Этот класс предназначен для внутреннего использования, и его API может измениться в минорных или
 * патч-релизах без предупреждения._
 */
export class ContainerRegistry {
  /**
   * Список всех известных контейнеров. Созданные контейнеры автоматически добавляются
   * в этот список. Два контейнера не могут быть зарегистрированы с одинаковым ID.
   *
   * Эта карта не содержит контейнер по умолчанию.
   * @private
   */
  private static readonly containerMap: Map<ContainerIdentifier, ContainerInstance> = new Map()

  /**
   * Глобальный контейнер по умолчанию. По умолчанию службы регистрируются в этот
   * контейнер при регистрации через `Container.set()` или декоратор `@Service`.
   */
  public static readonly defaultContainer: ContainerInstance = new ContainerInstance('default')

  public static registerContainer(container: ContainerInstance): void {
    if (container instanceof ContainerInstance === false) {
      throw new Error('Only ContainerInstance instances can be registered.')
    }

    if (!!ContainerRegistry.defaultContainer && container.id === 'default') {
      throw new Error('You cannot register a container with the "default" ID.')
    }

    if (ContainerRegistry.containerMap.has(container.id)) {
      throw new Error('Cannot register container with same ID.')
    }

    ContainerRegistry.containerMap.set(container.id, container)
  }

  public static hasContainer(id: ContainerIdentifier): boolean {
    return ContainerRegistry.containerMap.has(id)
  }

  public static getContainer(id: ContainerIdentifier): ContainerInstance {
    const registeredContainer = this.containerMap.get(id)

    if (registeredContainer === undefined) {
      throw new Error('No container is registered with the given ID.')
    }

    return registeredContainer
  }

  public static async removeContainer(container: ContainerInstance): Promise<void> {
    const registeredContainer = ContainerRegistry.containerMap.get(container.id)

    if (registeredContainer === undefined) {
      throw new Error('No container is registered with the given ID.')
    }

    ContainerRegistry.containerMap.delete(container.id)

    await registeredContainer.dispose()
  }
}
