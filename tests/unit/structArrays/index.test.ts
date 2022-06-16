import {describe, it, expect} from "vitest"
import {compile} from "../../../src/lib/structArrays/index"

describe("compiler rejects incorrect struct names", () => {
    it("should return null view, with name as empty string",  () =>  {
        const {view} = compile("", {x: "i32"})
        expect(view).toBe(null)
    })

    it("should return null view, with name as non string",  () =>  {
        expect(compile(null as any, {x: "i32"}).view).toBe(null)
        expect(compile([] as any, {x: "i32"}).view).toBe(null)
        expect(compile({} as any, {x: "i32"}).view).toBe(null)
        expect(compile(true as any, {x: "i32"}).view).toBe(null)
        expect(compile(false as any, {x: "i32"}).view).toBe(null)
        expect(compile(undefined as any, {x: "i32"}).view).toBe(null)
        expect(compile(Symbol() as any, {x: "i32"}).view).toBe(null)
        expect(compile(2 as any, {x: "i32"}).view).toBe(null)
        expect(compile(-2 as any, {x: "i32"}).view).toBe(null)
    })
})

describe("compiler rejects incorrect struct schemas", () => {
    it("should return null view, with schema as a non-object",  () =>  {
        expect(compile("struct", true as any).view).toBe(null)
        expect(compile("struct", false as any).view).toBe(null)
        expect(compile("struct", 4 as any).view).toBe(null)
        expect(compile("struct", -4 as any).view).toBe(null)
        expect(compile("struct", "{x: 'i32'}" as any).view).toBe(null)
        expect(compile("struct", Symbol() as any).view).toBe(null)
        expect(compile("struct", undefined as any).view).toBe(null)
    })

    it("should return null view, with schema as 'null' or an array",  () =>  {
        expect(compile("struct", [] as any).view).toBe(null)
        expect(compile("struct", null as any).view).toBe(null)
    })

    it("should return null view, with schema as object with 0 keys",  () =>  {
        expect(compile("struct", {}).view).toBe(null)
    })

    it("should return null view, with schema that has incorrect type", () => {
        expect(compile("struct", {x: "x32", y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: null, y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: [], y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: {}, y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: true, y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: false, y: "i32"} as any).view).toBe(null)
        expect(compile("struct", {x: 1, y: "i32"} as any).view).toBe(null)
    })

    it("should return null view, with schema that includes restricted key names", () => {
        expect(compile("struct", {"@@x": "i32", y: "i32"}).view).toBe(null)
        expect(compile("struct", {"@@y": "i32", y: "i32"}).view).toBe(null)
        expect(compile("struct", {"@@random_key": "i32", y: "i32"}).view).toBe(null)
        expect(compile("struct", {"index": "i32", y: "i32"}).view).toBe(null)
    })
})

describe("generates correct keys for schema", () => {
    it("keys specified in schema exist", () => {
        {
            const {view} = compile("vector3", {x: "f32", y: "f32", z: "f32"})
            if (!view) {
                throw TypeError("compiler didn't compile valid schema correctly")
            }
            const elements = 2
            const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
            const ptr = 0
            const array = new view.Factory(heap, ptr)
            const el0 = array.index(0)
            expect(el0.x).toBe(0.0)
            expect(el0.y).toBe(0.0)
            expect(el0.z).toBe(0.0)
            el0.x = 1.1; el0.y = 2.2; el0.z = 3.3;
            expect(el0.x).toBe(Math.fround(1.1))
            expect(el0.y).toBe(Math.fround(2.2))
            expect(el0.z).toBe(Math.fround(3.3))

            const el1 = array.index(1)
            expect(el1.x).toBe(0.0)
            expect(el1.y).toBe(0.0)
            expect(el1.z).toBe(0.0)
            el1.x = 3.2; el1.y = 16.7; el1.z = 0.1;
            expect(el1.x).toBe(Math.fround(3.2))
            expect(el1.y).toBe(Math.fround(16.7))
            expect(el1.z).toBe(Math.fround(0.1))

            /* Check if el0 was changed as well. 
            
            A fundamental limitation of these views is that 
            a view can only read and write to one element at 
            a time. Create multiple views over same heap & ptr 
            to overcome this. */
            const el0Again = array.index(0)
            expect(el0Again.x).toBe(Math.fround(1.1))
            expect(el0Again.y).toBe(Math.fround(2.2))
            expect(el0Again.z).toBe(Math.fround(3.3))
        }
        {
            const {view} = compile("animation", {state: "i32"})
            if (!view) {
                throw TypeError("compiler didn't compile valid schema correctly")
            }
            const elements = 2
            const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
            const ptr = 0
            const array = new view.Factory(heap, ptr)
            const el0 = array.index(0)
            expect(el0.state).toBe(0)
            el0.state = 5
            expect(el0.state).toBe(5)

            const el1 = array.index(1)
            expect(el1.state).toBe(0)
            el1.state = 43_888
            expect(el1.state).toBe(43_888)

            const el0Again = array.index(0)
            expect(el0Again.state).toBe(5)
        }
    })
})

describe("views with multiple data types", () => {
    it("can mix i32, f32, f64", () => {
        const {view} = compile("animation", {state: "i32", f: "f32", i6: "f64"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 2
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el = array.index(0)
        el.f = 1.3
        el.i6 = 1.3
        el.state = 1.3
        expect(el.f).toBe(Math.fround(1.3))
        expect(el.i6).toBe(1.3)
        expect(el.state).toBe(1)
    })

    it("can mix u8, i16, i32, f64", () => {
        const {view} = compile("animation", {
            state: "i32", 
            f: "i16", 
            i6: "f64",
            b: "u8"
        })
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 2
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el = array.index(0)
        el.f = 1.3
        el.i6 = 1.3
        el.state = 1.3
        el.b = 1.3
        expect(el.f).toBe(1)
        expect(el.i6).toBe(1.3)
        expect(el.state).toBe(1)
        expect(el.b).toBe(1)
        console.log(view)
    })
})

describe("correct types are generated for schema", () => {
    it("i64 is a 64-bit signed integer", () => {
        const {view} = compile("animation", {state: "i64"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1n << 63n) - 1n
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = 1n << 63n /* simulate overflow */
        expect(el0.state).toBeLessThan(0n)
        el0.state = -1n /* can be negative */
        expect(el0.state).toBe(-1n)
    })
    
    it("u64 is a 64-bit unsigned integer", () => {
        const {view} = compile("animation", {state: "u64"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1n << 64n) - 1n
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = 1n << 64n /* simulate overflow */
        expect(el0.state).toBe(0n)
        el0.state = -1n
        expect(el0.state).toBeGreaterThan(-1n) /* cannot be negative */
    })

    it("f64 and number are 64-bit floats", () => {
        {
            const {view} = compile("animation", {state: "f64"})
            if (!view) {
                throw TypeError("compiler didn't compile valid schema correctly")
            }
            const elements = 1
            const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
            const ptr = 0
            const array = new view.Factory(heap, ptr)
            const el0 = array.index(0)
            const largestNum = Number.MAX_SAFE_INTEGER
            el0.state = largestNum
            expect(el0.state).toBe(largestNum)
            el0.state = largestNum + 10 /* simulate overflow */
            const comparisonNumber = BigInt(largestNum) + 10n
            expect(BigInt(el0.state)).not.toBe(comparisonNumber)
            el0.state = 1.3
            expect(el0.state).toBe(1.3) /* can be decimal */
        }
        { /* copied from above */
            const {view} = compile("animation", {state: "number"})
            if (!view) {
                throw TypeError("compiler didn't compile valid schema correctly")
            }
            const elements = 1
            const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
            const ptr = 0
            const array = new view.Factory(heap, ptr)
            const el0 = array.index(0)
            const largestNum = Number.MAX_SAFE_INTEGER
            el0.state = largestNum
            expect(el0.state).toBe(largestNum)
            el0.state = largestNum + 10 /* simulate overflow */
            const comparisonNumber = BigInt(largestNum) + 10n
            expect(BigInt(el0.state)).not.toBe(comparisonNumber)
            el0.state = 1.3
            expect(el0.state).toBe(1.3) /* can be decimal */
        }
    })
    
    it("i32 is a 32-bit signed integer", () => {
        const {view} = compile("animation", {state: "i32"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = ((1 << 31) >>> 0) - 1
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = 1 << 31 /* simulate overflow */
        expect(el0.state).lessThan(0)
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBe(-1)
    })

    it("u32 is a 32-bit unsigned integer", () => {
        const {view} = compile("animation", {state: "u32"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largetNum = ((1 << 32) >>> 0) - 1
        el0.state = largetNum
        expect(el0.state).toBe(largetNum)
        el0.state = 1 << 32 /* simulate overflow */
        expect(el0.state).toBe(1)
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBeGreaterThan(-1) /* cannot be negative */
    })

    it("f32 is a 32-bit float", () => {
        const {view} = compile("animation", {state: "f32"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = Math.fround(16_777_216.0)
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = largestNum + Math.fround(1.0) /* simulate overflow */
        expect(el0.state).not.toBe(16_777_216.0 + 1.0)
        el0.state = 1.3 /* simulate imprecision */
        expect(el0.state).not.toBe(1.3)
        expect(el0.state).toBe(Math.fround(1.3))
    })

    it("i16 is a 16-bit signed integer", () => {
        const {view} = compile("animation", {state: "i16"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1 << 15) - 1
        el0.state = largestNum
        expect(largestNum).toBe(largestNum)
        el0.state = 1 << 15 /* simulate overflow */
        expect(el0.state).toBeLessThan(0)
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBe(-1)
    })

    it("i16 is a 16-bit unsigned integer", () => {
        const {view} = compile("animation", {state: "u16"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1 << 16) - 1
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = 1 << 16 /* simulate overflow */
        expect(el0.state).toBe(0) /* clamps automatically back to 0 */
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBeGreaterThan(-1)
    })

    it("i8 is a 8-bit signed integer", () => {
        const {view} = compile("animation", {state: "i8"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1 << 7) - 1
        el0.state = largestNum
        expect(el0.state).toBe(el0.state)
        el0.state = 1 << 7 /* simulate overflow */
        expect(el0.state).toBeLessThan(0)
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBe(-1)
    })

    it("u8 is a 8-bit unsigned integer", () => {
        const {view} = compile("animation", {state: "u8"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        const largestNum = (1 << 8) - 1
        el0.state = largestNum
        expect(el0.state).toBe(largestNum)
        el0.state = 1 << 8 /* simulate overflow */
        expect(el0.state).toBe(0) /* clamps automatically back to 0 */
        el0.state = 1.5 /* cannot be a decimal */
        expect(el0.state).toBe(Math.trunc(1.5))
        el0.state = -1
        expect(el0.state).toBeGreaterThan(-1)
    })

    it("boolean is boolean", () => {
        const {view} = compile("animation", {state: "boolean"})
        if (!view) {
            throw TypeError("compiler didn't compile valid schema correctly")
        }
        const elements = 1
        const heap = {dataview: new DataView(new ArrayBuffer(view.debug.bytes * elements))}
        const ptr = 0
        const array = new view.Factory(heap, ptr)
        const el0 = array.index(0)
        el0.state = true
        expect(el0.state).toBe(true)
        el0.state = false
        expect(el0.state).toBe(false)
    })
})