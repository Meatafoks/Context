import 'reflect-metadata'
import * as TypeDI from 'typedi'

export const RawService = TypeDI.Service
export const RawAutowire = TypeDI.Inject

export const Container = TypeDI.Container

export const Service = RawService()
export const Component = RawService()
export const Autowire = RawAutowire()
