import { Token } from './Token'
import { Constructable } from './types/Constructable'
import { ContextComponentIdentifier } from './types/ContextComponentIdentifier'
import { EMPTY_VALUE } from './const'
import { ContainerIdentifier } from './types/ContainerIdentifier'
import { ContainerRegistry } from './ContainerRegistry'
import { ContainerScope } from './types/ContainerScope'
import { ServiceMetadata } from './interfaces/ServiceMetadata'
import { Handler } from './interfaces/Handler'
import { ContextComponentNotFoundError } from './error/ContextComponentNotFoundError'
import { ServiceOptions } from './interfaces/ServiceOptions'
import { CannotInstantiateValueError } from './error/CannotInstantiateValueError'

/**
 * Контейнер службы, который хранит все зарегистрированные службы и их метаданные.
 */
export class ContainerInstance {
  public readonly id!: ContainerIdentifier
  public metadataMap: Map<ContextComponentIdentifier, ServiceMetadata<unknown>> = new Map()

  public multiServiceIds: Map<
    ContextComponentIdentifier,
    {
      tokens: Token<unknown>[]
      scope: ContainerScope
    }
  > = new Map()

  private readonly handlers: Handler[] = []

  private disposed: boolean = false

  constructor(id: ContainerIdentifier) {
    this.id = id

    ContainerRegistry.registerContainer(this)
    this.handlers = ContainerRegistry.defaultContainer?.handlers || []
  }

  /**
   * Проверяет, зарегистрирована ли служба с данным идентификатором в контейнере.
   * При необходимости можно передать параметры, если экземпляр инициализирован в контейнере впервые.
   * @param identifier
   */
  public has<T = unknown>(identifier: ContextComponentIdentifier<T>): boolean {
    this.throwIfDisposed()

    return !!this.metadataMap.has(identifier) || !!this.multiServiceIds.has(identifier)
  }

  /**
   * Получает службу с данным идентификатором из контейнера служб.
   * При необходимости можно передать параметры, если экземпляр инициализирован в контейнере впервые.
   * @param identifier
   */
  public get<T = unknown>(identifier: ContextComponentIdentifier<T>): T {
    this.throwIfDisposed()

    const global = ContainerRegistry.defaultContainer.metadataMap.get(identifier)
    const local = this.metadataMap.get(identifier)
    const metadata = global?.scope === 'singleton' ? global : local

    if (metadata && metadata.multiple === true) {
      throw new Error(`Cannot resolve multiple values for ${identifier.toString()} service!`)
    }

    if (metadata) {
      return this.getServiceValue(metadata)
    }

    if (global && this !== ContainerRegistry.defaultContainer) {
      const clonedService = { ...global }
      clonedService.value = EMPTY_VALUE

      this.set(clonedService)

      const value = this.getServiceValue(clonedService)
      this.set({ ...clonedService, value })

      return value
    }

    throw new ContextComponentNotFoundError(identifier)
  }

  /**
   * Возвращает все экземпляры, зарегистрированные в контейнере с данным идентификатором службы.
   * Используется, когда служба определена с флагом multiple: true.
   * @param identifier
   */
  public getMany<T = unknown>(identifier: ContextComponentIdentifier<T>): T[] {
    this.throwIfDisposed()

    const globalIdMap = ContainerRegistry.defaultContainer.multiServiceIds.get(identifier)
    const localIdMap = this.multiServiceIds.get(identifier)

    if (globalIdMap?.scope === 'singleton') {
      return globalIdMap.tokens.map(generatedId => ContainerRegistry.defaultContainer.get<T>(generatedId))
    }

    if (localIdMap) {
      return localIdMap.tokens.map(generatedId => this.get<T>(generatedId))
    }

    throw new ContextComponentNotFoundError(identifier)
  }

  /**
   * Устанавливает значение для данного типа или имени службы в контейнере.
   * @param serviceOptions
   */
  public set<T = unknown>(serviceOptions: ServiceOptions<T>): this {
    this.throwIfDisposed()

    if (serviceOptions.scope === 'singleton' && ContainerRegistry.defaultContainer !== this) {
      ContainerRegistry.defaultContainer.set(serviceOptions)

      return this
    }

    const newMetadata: ServiceMetadata<T> = {
      id: ((serviceOptions as any).id || (serviceOptions as any).type) as ContextComponentIdentifier,
      type: (serviceOptions as ServiceMetadata<T>).type || null,
      factory: (serviceOptions as ServiceMetadata<T>).factory,
      value: (serviceOptions as ServiceMetadata<T>).value || EMPTY_VALUE,
      multiple: serviceOptions.multiple || false,
      eager: serviceOptions.eager || false,
      scope: serviceOptions.scope || 'container',
      ...serviceOptions,
      referencedBy: new Map().set(this.id, this),
    }

    if (serviceOptions.multiple) {
      const maskedToken = new Token(`MultiMaskToken-${newMetadata.id.toString()}`)
      const existingMultiGroup = this.multiServiceIds.get(newMetadata.id)

      if (existingMultiGroup) {
        existingMultiGroup.tokens.push(maskedToken)
      } else {
        this.multiServiceIds.set(newMetadata.id, { scope: newMetadata.scope, tokens: [maskedToken] })
      }
      newMetadata.id = maskedToken
      newMetadata.multiple = false
    }

    const existingMetadata = this.metadataMap.get(newMetadata.id)

    if (existingMetadata) {
      Object.assign(existingMetadata, newMetadata)
    } else {
      this.metadataMap.set(newMetadata.id, newMetadata)
    }
    if (newMetadata.eager && newMetadata.scope !== 'transient') {
      this.get(newMetadata.id)
    }

    return this
  }

  public remove(identifierOrIdentifierArray: ContextComponentIdentifier | ContextComponentIdentifier[]): this {
    this.throwIfDisposed()

    if (Array.isArray(identifierOrIdentifierArray)) {
      identifierOrIdentifierArray.forEach(id => this.remove(id))
    } else {
      const serviceMetadata = this.metadataMap.get(identifierOrIdentifierArray)

      if (serviceMetadata) {
        this.disposeServiceInstance(serviceMetadata)
        this.metadataMap.delete(identifierOrIdentifierArray)
      }
    }

    return this
  }

  /**
   * Возвращает отдельный экземпляр контейнера для данного идентификатора контейнера.
   * @param containerId
   */
  public of(containerId: ContainerIdentifier = 'default'): ContainerInstance {
    this.throwIfDisposed()

    if (containerId === 'default') {
      return ContainerRegistry.defaultContainer
    }

    let container: ContainerInstance

    if (ContainerRegistry.hasContainer(containerId)) {
      container = ContainerRegistry.getContainer(containerId)
    } else {
      container = new ContainerInstance(containerId)
    }

    return container
  }

  /**
   * Регистрирует обработчик, который будет вызываться при создании экземпляра службы.
   * @param handler
   */
  public registerHandler(handler: Handler): ContainerInstance {
    this.handlers.push(handler)
    return this
  }

  public import(services: Function[]): ContainerInstance {
    this.throwIfDisposed()

    return this
  }

  /**
   * Полностью сбрасывает контейнер, удаляя из него все ранее зарегистрированные службы.
   * @param options
   */
  public reset(options: { strategy: 'resetValue' | 'resetServices' } = { strategy: 'resetValue' }): this {
    this.throwIfDisposed()

    switch (options.strategy) {
      case 'resetValue':
        this.metadataMap.forEach(service => this.disposeServiceInstance(service))
        break
      case 'resetServices':
        this.metadataMap.forEach(service => this.disposeServiceInstance(service))
        this.metadataMap.clear()
        this.multiServiceIds.clear()
        break
      default:
        throw new Error('Received invalid reset strategy.')
    }
    return this
  }

  public async dispose(): Promise<void> {
    this.reset({ strategy: 'resetServices' })

    this.disposed = true
    await Promise.resolve()
  }

  private throwIfDisposed() {
    if (this.disposed) {
      throw new Error('Cannot use container after it has been disposed.')
    }
  }

  /**
   * Возвращает значение, принадлежащее переданному экземпляру `ServiceMetadata`.
   * - если `serviceMetadata.value` уже установлен, он немедленно возвращается
   * - в противном случае запрашиваемый тип разрешается в значение, сохраненное в `serviceMetadata.value` и возвращается
   * @param serviceMetadata
   * @private
   */
  private getServiceValue(serviceMetadata: ServiceMetadata<unknown>): any {
    let value: unknown = EMPTY_VALUE

    // Если значение службы уже установлено на что-то до этого вызова, мы возвращаем это значение.
    // ПРИМЕЧАНИЕ: Эта часть основана на предположении, что временные зависимости никогда не имеют установленного значения.
    if (serviceMetadata.value !== EMPTY_VALUE) {
      return serviceMetadata.value
    }

    // Если отсутствуют и фабрика, и тип, мы не можем разрешить запрошенный идентификатор.
    if (!serviceMetadata.factory && !serviceMetadata.type) {
      throw new CannotInstantiateValueError(serviceMetadata.id)
    }

    if (serviceMetadata.factory) {
      // Если фабрика представлена в формате [Constructable<Factory>, "functionName"],
      // мы сначала должны создать фабрику, а затем вызвать указанную функцию.
      if (serviceMetadata.factory instanceof Array) {
        let factoryInstance

        try {
          // Пытаемся сначала получить фабрику из TypeDI, если не удалось, возвращаемся к простому созданию класса.
          factoryInstance = this.get<any>(serviceMetadata.factory[0])
        } catch (error) {
          if (error instanceof ContextComponentNotFoundError) {
            factoryInstance = new serviceMetadata.factory[0]()
          } else {
            throw error
          }
        }

        value = factoryInstance[serviceMetadata.factory[1]](this, serviceMetadata.id)
      } else {
        // Если была предоставлена только простая функция, мы просто вызываем ее.
        value = serviceMetadata.factory(this, serviceMetadata.id)
      }
    }

    if (!serviceMetadata.factory && serviceMetadata.type) {
      const constructableTargetType: Constructable<unknown> = serviceMetadata.type
      const paramTypes: unknown[] = (Reflect as any)?.getMetadata('design:paramtypes', constructableTargetType) || []
      const params = this.initializeParams(constructableTargetType, paramTypes)

      params.push(this)

      value = new constructableTargetType(...params)
    }

    // Если это не временная служба и значение не равно пустому значению, устанавливаем значение службы.
    if (serviceMetadata.scope !== 'transient' && value !== EMPTY_VALUE) {
      serviceMetadata.value = value
    }

    if (value === EMPTY_VALUE) {
      throw new CannotInstantiateValueError(serviceMetadata.id)
    }

    if (serviceMetadata.type) {
      this.applyPropertyHandlers(serviceMetadata.type, value as Record<string, any>)
    }

    return value
  }

  /**
   * Инициализирует все типы параметров для данного целевого класса службы.
   * @param target
   * @param paramTypes
   * @private
   */
  private initializeParams(target: Function, paramTypes: any[]): unknown[] {
    return paramTypes.map((paramType, index) => {
      const paramHandler =
        this.handlers.find(handler => {
          /**
           * Подключенные значения хранятся как обработчики параметров и ссылается на свой объект
           * при создании. Поэтому, когда класс расширяется, подключенные значения не наследуются,
           * потому что обработчик все еще указывает только на старый объект.
           *
           * В качестве быстрого решения добавляется поиск родителя одного уровня через `Object.getPrototypeOf(target)`,
           * однако это должно быть обновлено до более надежного решения.
           */
          return handler.object === target && handler.index === index
        }) ||
        this.handlers.find(handler => {
          return handler.object === Object.getPrototypeOf(target) && handler.index === index
        })

      if (paramHandler) return paramHandler.value(this)

      if (paramType && paramType.name && !this.isPrimitiveParamType(paramType.name)) {
        return this.get(paramType)
      }

      return undefined
    })
  }

  /**
   * Производит проверку, является ли данный тип параметра примитивным или нет.
   * @param paramTypeName
   * @private
   */
  private isPrimitiveParamType(paramTypeName: string): boolean {
    return ['string', 'boolean', 'number', 'object'].includes(paramTypeName.toLowerCase())
  }

  /**
   * Прикладывает все зарегистрированные обработчики к данному классу.
   *
   * @param target
   * @param instance
   * @private
   */
  private applyPropertyHandlers(target: Function, instance: { [key: string]: any }) {
    this.handlers.forEach(handler => {
      if (typeof handler.index === 'number') return
      if (handler.object.constructor !== target && !(target.prototype instanceof handler.object.constructor)) return

      if (handler.propertyName) {
        instance[handler.propertyName] = handler.value(this)
      }
    })
  }

  /**
   * Проверяет, содержит ли метаданные службы уничтожаемый экземпляр службы и уничтожает его на месте. Если служба
   * содержит вызываемую функцию с именем `destroy`, она вызывается, но не ожидается, и возвращаемое значение игнорируется.
   *
   * @param serviceMetadata служба, содержащая экземпляр для уничтожения
   * @param force если true, служба всегда будет уничтожена, даже если ее нельзя воссоздать
   */
  private disposeServiceInstance(serviceMetadata: ServiceMetadata, force = false) {
    this.throwIfDisposed()

    // Мы сбрасываем значение только в том случае, если мы можем его воссоздать (т.е. существует тип или фабрика).
    const shouldResetValue = force || !!serviceMetadata.type || !!serviceMetadata.factory

    if (shouldResetValue) {
      // Если мы нашли функцию с именем destroy, мы вызываем ее без параметров.
      if (typeof (serviceMetadata?.value as Record<string, unknown>)['dispose'] === 'function') {
        try {
          ;(serviceMetadata.value as { dispose: CallableFunction }).dispose()
        } catch (error) {
          // Мы просто игнорируем ошибки из функции уничтожения.
        }
      }

      serviceMetadata.value = EMPTY_VALUE
    }
  }
}
