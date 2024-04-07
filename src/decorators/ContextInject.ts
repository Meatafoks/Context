import { ContainerRegistry } from '../ContainerRegistry'
import { Token } from '../Token'
import { ContextComponentIdentifier } from '../types/ContextComponentIdentifier'
import { Constructable } from '../types/Constructable'
import { resolveToTypeWrapper } from '../utils/resolveToTypeWrapper'
import { CannotInjectValueError } from '../error/CannotInjectValueError'

/**
 * Внедряет зависимость в контексте компонента.
 * @constructor
 */
export function ContextInject(): Function
export function ContextInject(typeFn: (type?: never) => Constructable<unknown>): Function
export function ContextInject(serviceName?: string): Function
export function ContextInject(token: Token<unknown>): Function
export function ContextInject(
  typeOrIdentifier?: ((type?: never) => Constructable<unknown>) | ContextComponentIdentifier<unknown>,
): ParameterDecorator | PropertyDecorator {
  return function (target: Object, propertyName: string | Symbol, index?: number): void {
    const typeWrapper = resolveToTypeWrapper(typeOrIdentifier, target, propertyName, index)

    // Если тип не был выведен или был выведен общий тип Object, мы выбрасываем ошибку.
    if (typeWrapper === undefined || typeWrapper.eagerType === undefined || typeWrapper.eagerType === Object) {
      throw new CannotInjectValueError(target as Constructable<unknown>, propertyName as string)
    }

    ContainerRegistry.defaultContainer.registerHandler({
      object: target as Constructable<unknown>,
      propertyName: propertyName as string,
      index: index,
      value: containerInstance => {
        const evaluatedLazyType = typeWrapper.lazyType()

        // Если тип не был выведен лениво или был выведен общий тип Object, мы выбрасываем ошибку.
        if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
          throw new CannotInjectValueError(target as Constructable<unknown>, propertyName as string)
        }

        return containerInstance.get<unknown>(evaluatedLazyType)
      },
    })
  }
}
