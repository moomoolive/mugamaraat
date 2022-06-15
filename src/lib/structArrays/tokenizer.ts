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
const len_index = MAX_FIELDS

const addFieldTokens = (elementBytes: number, schema: Schema, nameIndexes: Int32Array, tokens: FieldToken[], currentOffset: number, names: string[]) => {
    let offset = currentOffset
    const len = nameIndexes[len_index]
    for (let i = 0; i < len; i++) {
        const name = names[nameIndexes[i]]
        const type = schema[name]
        tokens.push({name, type, offset})
        offset += elementBytes
    }
    return offset
}

const type_buffer = () => new Int32Array(MAX_FIELDS + 1)
const type_64bit = type_buffer() 
const type_32bit = type_buffer() 
const type_16bit = type_buffer()
const type_8bit = type_buffer()

export const tokenizeStruct = (structName: string, schema: Schema) => {
    if (typeof structName !== "string" || structName.length < 1) {
        return {token: null, msg: `Invalid name. Name must be a non-empty string (got name=${String(structName)}, type=${typeof structName}).`}
    }
    const schemaType = typeof schema
    if (schemaType !== "object" || schema === null || Array.isArray(schema)) {
        return {token: null, msg: `Invalid schema for "${structName}". Schema must an object with valid one of valid data types (${DATA_TYPES.join(", ")}. Got type=${typeof schema}).`}
    }
    const originalFields = Object.keys(schema)
    if (originalFields.length < 1 || originalFields.length > MAX_FIELDS) {
        return {token: null, msg: `invalid schema for "${structName}". Schema must have between 1 and ${MAX_FIELDS} fields, got=${originalFields.length}.`}
    }

    type_64bit[len_index] = 0, type_32bit[len_index] = 0
    type_16bit[len_index] = 0, type_8bit[len_index] = 0
    
    const fields = alignFields(originalFields)
    for (let i = 0; i < fields.length; i++) {
        const name = fields[i]
        if (!validFieldName(name)) {
            return {token: null, msg: `field name "${name}" of "${structName}" cannot start with "${INTERNAL_FIELD_PREFIX}".`}
        }
        switch (schema[name]) {
            case "num": 
            case "f64":
                type_64bit[type_64bit[len_index]++] = i; break;
            case "i32": 
            case "u32": 
            case "f32":
                type_32bit[type_32bit[len_index]++] = i; break;
            case "i16": 
            case "u16":
                type_16bit[type_16bit[len_index]++] = i; break;
            case "i8": 
            case "u8": 
            case "bool":
                type_8bit[type_8bit[len_index]++] = i; break;
        }
    }

    const token = new StructToken(structName, JSON.stringify(schema))
    let bytes = 0

    const bytesIn64bits = 8
    bytes = addFieldTokens(bytesIn64bits, schema, type_64bit, token.fields, bytes, fields)
    bytes = addFieldTokens(4, schema, type_32bit, token.fields, bytes, fields)
    bytes = addFieldTokens(2, schema, type_16bit, token.fields, bytes, fields)
    bytes = addFieldTokens(1, schema, type_8bit, token.fields, bytes, fields)

    /* all structs are aligned to 8 bytes */
    const dividedBy64bits = bytes % bytesIn64bits
    const alignedTo64bits = dividedBy64bits === 0
    if (!alignedTo64bits) {
        bytes += dividedBy64bits
    }

    token.bytes = bytes
    token.paddingBytes = dividedBy64bits
    return {token, msg: "successfully tokenized"}
}