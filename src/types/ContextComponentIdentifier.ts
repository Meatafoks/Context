import { Token } from '../Token'
import { Constructable } from './Constructable'
import { AbstractConstructable } from './AbstractConstructable'

/**
 * Уникальный идентификатор компонента контекста.
 * Может быть классом, строковым идентификатором или экземпляром Token.
 */
export type ContextComponentIdentifier<T = unknown> =
  | Constructable<T>
  | AbstractConstructable<T>
  | CallableFunction
  | Token<T>
  | string
