/**
 * Обобщенный тип для определений классов.
 * Пример использования:
 * ```
 * function createSomeInstance(myClassDefinition: Constructable<MyClass>) {
 *  return new myClassDefinition()
 *  }
 *  ```
 */
export type Constructable<T> = new (...args: any[]) => T
