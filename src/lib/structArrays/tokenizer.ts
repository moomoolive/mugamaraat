import {Type, Schema, DATA_TYPES} from "./types"

type FieldToken = { name: string, offset: number, type: Type }

export class StructToken {
    name: string
    fields: FieldToken[]
    stringifiedSchema: string
    paddingBytes: number
    bytes: number

    constructor(name: string, stringifiedSchema: string) {
        this.name = name
        this.fields = []
        this.stringifiedSchema = stringifiedSchema
        this.paddingBytes = 0
        this.bytes = 0
    }
}

const INTERNAL_FIELD_PREFIX = "@@"
export const INDEX_METHOD = "index"

const validFieldName = (name: string) => !name.startsWith(INTERNAL_FIELD_PREFIX) && name !== INDEX_METHOD
/* Fields in definition are reordered alphabetical (A to Z).
This makes structs consistently aligned, as field offsets 
are always the same - regardless of the host runtime.*/
const alignFields = (fields: string[]) => fields.sort()

export const MAX_FIELDS = 9



const MEMORY_LAYOUT_VARIANTS = 4
const META_DATA_PER_VARIANT = 1
/* create buffer once and reuse for entire lifetime of 
library, to make compiler faster */
const typeVariantBuffer = new Int32Array(
    (MAX_FIELDS + META_DATA_PER_VARIANT) * MEMORY_LAYOUT_VARIANTS
)
const ptrsStart = 4
const variant_64bit = 0
const ptr_64bitStart = ptrsStart + (variant_64bit * MAX_FIELDS)
const variant_32bit = 1
const ptr_32bitStart = ptrsStart + (variant_32bit * MAX_FIELDS)
const variant_16bit = 2
const ptr_16bitStart = ptrsStart + (variant_16bit * MAX_FIELDS)
const variant_8bit = 3
const ptr_8bitStart = ptrsStart + (variant_8bit * MAX_FIELDS)

const tokenizeMemoryVariant = (
    elementBytes: number, schema: Schema, 
    tokens: FieldToken[], ptrOffset: number, 
    currentOffset: number, names: string[],
    variantId: number
) => {
    let offset = currentOffset
    const count = typeVariantBuffer[variantId]
    const len = ptrOffset + count
    for (let i = ptrOffset; i < len; i++) {
        const name = names[typeVariantBuffer[i]]
        const type = schema[name]
        tokens.push({name, type, offset})
        offset += elementBytes
    }
    return offset
}

const res = (msg: string, token: null | StructToken = null) => ({token, msg})

export const tokenizeStruct = (structName: string, schema: Schema) => {
    if (typeof structName !== "string" || structName.length < 1) {
        return res(`Invalid name. Name must be a non-empty string (got name=${String(structName)}, type=${typeof structName}).`)
    }
    const schemaType = typeof schema
    if (schemaType !== "object" || schema === null || Array.isArray(schema)) {
        return res(`Invalid schema for "${structName}". Schema must an object with valid one of valid data types (${DATA_TYPES.join(", ")}. Got type=${typeof schema}).`)
    }
    const originalFields = Object.keys(schema)
    if (originalFields.length < 1 || originalFields.length > MAX_FIELDS) {
        return res(`invalid schema for "${structName}". Schema must have between 1 and ${MAX_FIELDS} fields, got=${originalFields.length}.`)
    }

    typeVariantBuffer[variant_64bit] = 0
    typeVariantBuffer[variant_32bit] = 0
    typeVariantBuffer[variant_16bit] = 0
    typeVariantBuffer[variant_8bit] = 0
    
    const fields = alignFields(originalFields)
    for (let i = 0; i < fields.length; i++) {
        const name = fields[i]
        if (!validFieldName(name)) {
            return res(`field name "${name}" of "${structName}" cannot start with "${INTERNAL_FIELD_PREFIX}" or be named "${INDEX_METHOD}".`)
        }
        const type = schema[name]
        switch (type) {
            case "i64":
            case "u64":
            case "f64":
            case "number": {
                const count = typeVariantBuffer[variant_64bit]++
                typeVariantBuffer[ptr_64bitStart + count] = i 
                break
            }
            case "i32": 
            case "u32": 
            case "f32": {
                const count = typeVariantBuffer[variant_32bit]++
                typeVariantBuffer[ptr_32bitStart + count] = i 
                break
            }
            case "i16": 
            case "u16": {
                const count = typeVariantBuffer[variant_16bit]++
                typeVariantBuffer[ptr_16bitStart + count] = i 
                break
            }
            case "i8": 
            case "u8": 
            case "boolean": {
                const count = typeVariantBuffer[variant_8bit]++
                typeVariantBuffer[ptr_8bitStart + count] = i 
                break
            }
            default:
                return res(`field "${name}" of "${structName}" is an unknown type (got=${type}, accepted=${DATA_TYPES.join(", ")})."`)
        }
    }

    const token = new StructToken(
        structName, JSON.stringify(schema)
    )
    let bytes = 0

    const bytesIn64bits = 8
    bytes = tokenizeMemoryVariant(
        bytesIn64bits, schema, 
        token.fields, ptr_64bitStart, 
        bytes, fields, variant_64bit
    )
    
    bytes = tokenizeMemoryVariant(
        4, schema,
        token.fields, ptr_32bitStart, 
        bytes, fields, variant_32bit
    )

    bytes = tokenizeMemoryVariant(
        2, schema,
        token.fields, ptr_16bitStart, 
        bytes, fields, variant_16bit
    )
    
    bytes = tokenizeMemoryVariant(
        1, schema,
        token.fields, ptr_8bitStart, 
        bytes, fields, variant_8bit
    )

    /* all structs are aligned to 8 bytes */
    const dividedBy64bits = bytes % bytesIn64bits
    const alignedTo64bits = dividedBy64bits === 0
    if (!alignedTo64bits) {
        bytes += dividedBy64bits
    }

    token.bytes = bytes
    token.paddingBytes = dividedBy64bits
    return res("success", token)
}
