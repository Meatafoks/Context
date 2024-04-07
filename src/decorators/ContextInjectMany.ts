import { ContainerRegistry } from '../ContainerRegistry'
import { Token } from '../Token'
import { resolveToTypeWrapper } from '../utils/resolveToTypeWrapper'
import { Constructable } from '../types/Constructable'
import { ContextComponentIdentifier } from '../types/ContextComponentIdentifier'
import { CannotInjectValueError } from '../error/CannotInjectValueError'

export function ContextInjectMany(): Function
export function ContextInjectMany(type?: (type?: any) => Function): Function
export function ContextInjectMany(serviceName?: string): Function
export function ContextInjectMany(token: Token<any>): Function
export function ContextInjectMany(
  typeOrIdentifier?: ((type?: never) => Constructable<unknown>) | ContextComponentIdentifier<unknown>,
): Function {
  return function (target: Object, propertyName: string | Symbol, index?: number): void {
    const typeWrapper = resolveToTypeWrapper(typeOrIdentifier, target, propertyName, index)

    if (typeWrapper === undefined || typeWrapper.eagerType === undefined || typeWrapper.eagerType === Object) {
      throw new CannotInjectValueError(target as Constructable<unknown>, propertyName as string)
    }

    ContainerRegistry.defaultContainer.registerHandler({
      object: target as Constructable<unknown>,
      propertyName: propertyName as string,
      index: index,
      value: containerInstance => {
        const evaluatedLazyType = typeWrapper.lazyType()

        if (evaluatedLazyType === undefined || evaluatedLazyType === Object) {
          throw new CannotInjectValueError(target as Constructable<unknown>, propertyName as string)
        }

        return containerInstance.getMany<unknown>(evaluatedLazyType)
      },
    })
  }
}
