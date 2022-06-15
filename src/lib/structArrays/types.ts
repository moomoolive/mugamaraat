export const DATA_TYPES = [
    "num"/* alias for f64 */, "f64", /* 64-bit types */
    "f32", "i32", "u32", /* 32-bit types */
    "i16", "u16", /* 16-bit types */
    "u8", "i8", "bool", /* 8-bit types */
] as const

export type Type = typeof DATA_TYPES[number]

type f64<T extends Type> = T extends "f64" ? number : never
type num<T extends Type> = T extends "num" ? f64<"f64"> : never
type f32<T extends Type> = T extends "f32" ? number : never
type i32<T extends Type> = T extends "i32" ? number : never
type u32<T extends Type> = T extends "u32" ? number : never
type i16<T extends Type> = T extends "i16" ? number : never
type u16<T extends Type> = T extends "u16" ? number : never
type i8<T extends Type> = T extends "i8" ? number : never
type u8<T extends Type> = T extends "u8" ? number : never
type bool<T extends Type> = T extends "bool" ? boolean : never

export type Primitive<T extends Type> = (
    f64<T> | num<T> | 
    i32<T> | f32<T> | u32<T> | 
    i16<T> | u16<T> |
    i8<T> | u8<T> | bool<T> 
)

export type Schema = {
    readonly [key: string]: Type
}

export type Struct<S extends Schema> = {
    [key in keyof S]: Primitive<S[key]>
}
