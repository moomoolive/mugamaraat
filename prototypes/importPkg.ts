import {Package} from "./pkgTypes"

export const externalPkg = new Package({
    name: "extern",
    components: {
        vec2: {x: "f32", y: "f32"},
    }
})

export const physx = new Package({
    name: "physx",
    components: {
        vec4: {x: "f32", y: "f32", z: "f32", w: "f32"},
    }
})