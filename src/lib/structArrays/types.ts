export const DATA_TYPES = [
    "num", /* alias for f64 */ 
    "f64", 
    "f32", 
    "i32",
    "bool"
] as const

export type Type = typeof DATA_TYPES[number]

export type bool<T extends Type> = T extends "bool" ? boolean : never
export type f64<T extends Type> = T extends "f64" ? number : never
export type num<T extends Type> = T extends "num" ? number : never
export type f32<T extends Type> = T extends "f32" ? number : never
export type i32<T extends Type> = T extends "i32" ? number : never

export type Primitive<T extends Type> = (
    f64<T> | num<T> | i32<T> | f32<T> /* number types */
    | bool<T>
)

export type Schema = {
    readonly [key: string]: Type
}

export type Struct<S extends Schema> = {
    [key in keyof S]: Primitive<S[key]>
}
