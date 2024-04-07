import { ContextComponentIdentifier } from '../types/ContextComponentIdentifier'
import { Token } from '../Token'

/**
 * Возникает, когда DI не может внедрить значение в свойство, декорированное декоратором @Inject.
 */
export class CannotInstantiateValueError extends Error {
  public name = 'CannotInstantiateValueError'

  private readonly normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>'

  get message(): string {
    return (
      `Cannot instantiate the requested value for the "${this.normalizedIdentifier}" identifier. ` +
      `The related metadata doesn't contain a factory or a type to instantiate.`
    )
  }

  constructor(identifier: ContextComponentIdentifier) {
    super()

    // TODO: Extract this to a helper function and share between this and NotFoundError.
    if (typeof identifier === 'string') {
      this.normalizedIdentifier = identifier
    } else if (identifier instanceof Token) {
      this.normalizedIdentifier = `Token<${identifier.name || 'UNSET_NAME'}>`
    } else if (identifier && (identifier.name || identifier.prototype?.name)) {
      this.normalizedIdentifier =
        `MaybeConstructable<${identifier.name}>` ||
        `MaybeConstructable<${(identifier.prototype as { name: string })?.name}>`
    }
  }
}
