import { ContextComponentIdentifier } from '../types/ContextComponentIdentifier'
import { Token } from '../Token'

export class ContextComponentNotFoundError extends Error {
  public name = 'ContextComponentNotFoundError'

  private readonly normalizedIdentifier: string = '<UNKNOWN_IDENTIFIER>'

  get message(): string {
    return (
      `Service with "${this.normalizedIdentifier}" identifier was not found in the container. ` +
      `Register it before usage via explicitly calling the "Container.set" function or using the "@Service()" decorator.`
    )
  }

  constructor(identifier: ContextComponentIdentifier) {
    super()

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
