import { Token } from '../Token'
import { Constructable } from '../types/Constructable'
import { ContextComponentIdentifier } from '../types/ContextComponentIdentifier'

/**
 * Вспомогательная функция, используемая в декораторах внедрения для разрешения полученного идентификатора
 * к жадному типу, когда это возможно, или к ленивому типу, когда возможно вовлечение циклических зависимостей.
 *
 * @param typeOrIdentifier идентификатор службы или функция, возвращающая тип, действующий как идентификатор службы или ничего
 * @param target определение класса цели декоратора
 * @param propertyName имя свойства в случае PropertyDecorator
 * @param index индекс параметра в конструкторе в случае ParameterDecorator
 */
export function resolveToTypeWrapper(
  typeOrIdentifier: ((type?: never) => Constructable<unknown>) | ContextComponentIdentifier<unknown> | undefined,
  target: Object,
  propertyName: string | Symbol,
  index?: number,
): { eagerType: ContextComponentIdentifier | null; lazyType: (type?: never) => ContextComponentIdentifier } {
  /**
   * ? Мы хотим как можно скорее вызвать ошибку при поиске служб для внедрения, однако
   * ? мы не можем определить тип при выполнении декоратора, когда вовлечены циклические зависимости
   * ? потому что вызов функции `() => MyType`, полученной сразу, вызвал бы ошибку JS:
   * ? "Cannot access 'MyType' before initialization", поэтому нам нужно выполнить функцию в обработчике,
   * ? когда классы уже созданы. Чтобы преодолеть это, мы используем обертку:
   * ?  - lazyType выполняется в обработчике, поэтому у нас никогда нет ошибки JS
   * ?  - eagerType проверяется при выполнении декоратора, и возникает ошибка, если встречается неизвестный тип
   */
  let typeWrapper!: {
    eagerType: ContextComponentIdentifier | null
    lazyType: (type?: never) => ContextComponentIdentifier
  }

  // Если запрошенный тип явно установлен с помощью строки ID или токена, мы устанавливаем его явно.
  if ((typeOrIdentifier && typeof typeOrIdentifier === 'string') || typeOrIdentifier instanceof Token) {
    typeWrapper = { eagerType: typeOrIdentifier, lazyType: () => typeOrIdentifier }
  }

  // Если запрошенный тип явно установлен с помощью формата () => MyClassType, мы устанавливаем его явно.
  if (typeOrIdentifier && typeof typeOrIdentifier === 'function') {
    /** We set eagerType to null, preventing the raising of the CannotInjectValueError in decorators.  */
    typeWrapper = { eagerType: null, lazyType: () => (typeOrIdentifier as CallableFunction)() }
  }

  // Если явный тип не установлен и обработчик зарегистрирован для свойства класса, нам нужно получить тип свойства.
  if (!typeOrIdentifier && propertyName) {
    const identifier = (Reflect as any).getMetadata('design:type', target, propertyName)

    typeWrapper = { eagerType: identifier, lazyType: () => identifier }
  }

  // Если явный тип не установлен и обработчик зарегистрирован для параметра конструктора, нам нужно получить типы параметров.
  if (!typeOrIdentifier && typeof index == 'number' && Number.isInteger(index)) {
    const paramTypes: ContextComponentIdentifier[] = (Reflect as any).getMetadata(
      'design:paramtypes',
      target,
      propertyName,
    )
    // Не гарантируется, что мы найдем какие-либо типы для конструктора.
    const identifier = paramTypes?.[index]

    typeWrapper = { eagerType: identifier, lazyType: () => identifier }
  }

  return typeWrapper
}
