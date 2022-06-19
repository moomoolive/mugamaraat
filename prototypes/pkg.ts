import {Package} from "./pkgTypes"
import {externalPkg, physx} from "./importPkg"

export const pkg = new Package({
    name: "pkg",
    imports: {externalPkg, physx},
    components: {
        vec3: {x: "f32", y: "f32", z: "f32"},
    },
    aliases: {
        transform: "vec4_physx", 
        pos: "vec3_pkg"
    },
    archetypes: {
        player: ["vec2_extern", "pos_pkg"],
        enemy: ["vec4_physx", "vec2_extern"]
    },
    queries: {
        externVec: ["vec2_extern"],
        allVec: ["vec2_extern", "vec4_physx"]
    }
})

pkg.setup = ({createEntity}) => {
    createEntity("player_pkg")
        .vec2_extern({x: 1.0, y: 1.0})
        .pos_pkg({x: 1.0, y: 1.0, z: 1.0})
        .commit()
    createEntity("enemy_pkg")
        .vec4_physx({x: 1.0, y: 1.0, z: 1.0, w: 1.0})
        .vec2_extern({x: 0.0, y: 0.0})
        .commit()
}

pkg.system("externVec", ({iter}) => {
    iter()
})

pkg.psystem("allVec", ({iter}) => {
    iter()
})
