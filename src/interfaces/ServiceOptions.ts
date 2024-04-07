import { ServiceMetadata } from './ServiceMetadata'

/**
 * Публичный ServiceOptions - это частичный объект ServiceMetadata и один из следующих
 * установлен: `type`, `factory`, `value`, но не более одного.
 */
export type ServiceOptions<T = unknown> =
  | Omit<Partial<ServiceMetadata<T>>, 'referencedBy' | 'type' | 'factory'>
  | Omit<Partial<ServiceMetadata<T>>, 'referencedBy' | 'value' | 'factory'>
  | Omit<Partial<ServiceMetadata<T>>, 'referencedBy' | 'value' | 'type'>
