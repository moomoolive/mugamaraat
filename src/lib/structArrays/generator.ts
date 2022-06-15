import {Struct, Schema} from "./types"
import {StructToken, INDEX_METHOD, tokenizeStruct} from "./tokenizer"

export interface Heap { 
    dataview: DataView 
}

export type StructArray<S extends Schema> = {
    "@@heap": Heap
    "@@cursor": number
    "@@ptr": number
    readonly "@@bytesPerElement": number
    index: (i: number) => Struct<S>
}

const USE_LITTLE_ENDIAN = true

const generateArrayView = <S extends Schema>(token: StructToken) => {
    const {bytes} = token
    const View = function(this: StructArray<S>, heap: Heap, ptr: number) {
        this["@@heap"] = heap
        this["@@ptr"] = ptr
        this["@@cursor"] = 0
        {(this["@@bytesPerElement"] as number) = bytes}
    } as unknown as { new(heap: Heap, ptr: number): StructArray<S> }

    /* set name of 'View' for debugging purposes */
    const viewName = `${token.name}Array`
    Object.defineProperty(View, "name", {value: viewName})
    
    const methods = {}
    Object.defineProperty(methods, INDEX_METHOD, {
        value(this: StructArray<S>, index: number) {
            this["@@cursor"] = this["@@ptr"] + (index * bytes)
            return this
        }
    })

    const {fields} = token
    for (let i = 0; i < fields.length; i++) {
        const {name, offset, type} = fields[i]
        switch (type) {
            case "i64":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getBigInt64(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: bigint) {
                        this["@@heap"].dataview.setBigInt64(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "u64":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getBigUint64(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: bigint) {
                        this["@@heap"].dataview.setBigUint64(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "f64":
            case "number":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getFloat64(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setFloat64(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "i32":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getInt32(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setInt32(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "u32":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getUint32(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setUint32(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "f32":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getFloat32(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setFloat32(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "i16":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getInt16(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setInt16(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "u16":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getUint16(this["@@cursor"] + offset, USE_LITTLE_ENDIAN)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setUint16(this["@@cursor"] + offset, val, USE_LITTLE_ENDIAN)
                    }
                })
                break
            case "i8":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getInt8(this["@@cursor"] + offset)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setInt8(this["@@cursor"] + offset, val)
                    }
                })
                break
            case "u8":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return this["@@heap"].dataview.getUint8(this["@@cursor"] + offset)
                    },
                    set(this: StructArray<S>, val: number) {
                        this["@@heap"].dataview.setUint8(this["@@cursor"] + offset, val)
                    }
                })
                break
            case "boolean":
                Object.defineProperty(methods, name, {
                    get(this: StructArray<S>) {
                        return Boolean(this["@@heap"].dataview.getUint8(this["@@cursor"] + offset))
                    },
                    set(this: StructArray<S>, val: boolean) {
                        this["@@heap"].dataview.setUint8(this["@@cursor"] + offset, Number(val))
                    }
                })
                break
        }
    }
    View.prototype = methods
    return View
}

export const compile = <S extends Schema>(name: string, schema: S) => {
    const {token, msg} = tokenizeStruct(name, schema)
    if (token === null) {
        return {msg, view: null}
    }
    const Factory = generateArrayView<S>(token)
    return {msg, view: {Factory, debug: token}}
}
