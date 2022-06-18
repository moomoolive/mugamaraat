type Type = "i32" | "f32"

type Schema = {
    readonly [key: string]: Type
}

type Struct<S extends Schema> = {
    [key in keyof S]: number
}

type ComponentsDeclaration = {
    readonly [key: string]: Schema
}

type PackageComponents<N extends string, C extends ComponentsDeclaration> = keyof {
    [key in keyof C as `${N & string}_${keyof C & string}`]: true
}

type Import = {
    readonly name: string, 
    readonly components: ComponentsDeclaration
}

type Imports = {
    readonly [key: string]: Import
} 

type ComponentImports<I extends Imports> = keyof {
    [key in keyof I as `${I[key]["name"]}_${keyof I[key]["components"] & string}`]: true
}

type ComponentScope<I extends Imports, N extends string, C extends ComponentsDeclaration> = (
    ComponentImports<I> | PackageComponents<N, C>
)

type y = PackageComponents<"pkg", {
    vec2: {x: "f32", y: "f32"},
}>

type x = ComponentImports<{
    p1: {
        name: "extern",
        components: {
            vec2: {x: "f32", y: "f32"},
        }
    },
    p2: {
        name: "physx",
        components: {
            vec4: {x: "f32", y: "f32", z: "f32", w: "f32"},
        }
    }
}>

type ImportedComponentDeclarations<I extends Imports> = {
    [key in keyof I as `${I[key]["name"]}_${keyof I[key]["components"] & string}`]: (
        I[key]["components"][keyof I[key]["components"]]
    )
}

type z = ImportedComponentDeclarations<{
    p1: {
        name: "extern",
        components: {
            vec2: {x: "f32", y: "f32"},
        }
    },
    p2: {
        name: "physx",
        components: {
            vec4: {x: "f32", y: "f32", z: "f32", w: "f32"},
        }
    }
}>

type ComponentsDeclarationWithName<
    Name extends string, 
    Components extends ComponentsDeclaration
> = {
    [key in keyof Components as `${Name & string}_${key & string}`]: Components[key]
}

type AllComponents<
    I extends Imports, 
    Declared extends ComponentsDeclaration, 
    Name extends string
> = (
    ImportedComponentDeclarations<I>
    & ComponentsDeclarationWithName<Name, Declared>
)

type Archetype<ComponentNames extends string> = {
    readonly [key: string]: Readonly<ComponentNames[]>
}

type EcsMutator<
    C extends ComponentsDeclaration,
    keys extends string,
> = {
    [key in keys]: (data: Struct<C[key]>) => EcsMutator<C, keys> & {
        commit: () => number 
    }
}

type ParallelJobs = { 
    readonly [key: string]: Function 
}

type Ecs<
    C extends ComponentsDeclaration, 
    Archetypes extends Archetype<keyof C & string>,
    Queries extends QueryDefs<keyof C & string>,
    Jobs extends ParallelJobs
> = {
    createEntity: <
        T extends string & keyof Archetypes,
        Keys extends Archetypes[T][number]
    >(arch: T) => EcsMutator<C, Keys>
    query: (q: keyof Queries & string) => {
        iter: () => void,
        paraIter: (job: keyof Jobs & string) => void
    }

}

type QueryDefs<ComponentNames extends string> = {
    readonly [key: string]: Readonly<ComponentNames[]>
}

class Package<
    Name extends string,
    Declared extends ComponentsDeclaration,
    Packages extends Imports,
    Components extends AllComponents<Packages, Declared, Name>,
    Archetypes extends Archetype<keyof Components & string>,
    Queries extends QueryDefs<keyof Components & string>,
    Jobs extends ParallelJobs
> {
    
    readonly name: Name
    readonly imports: Packages
    readonly components: Declared
    readonly archetypes: Archetypes
    readonly queries: Queries
    meta: Record<string, string>
    systems: Record<string, ((ecs: Ecs<Components, Archetypes, Queries, Jobs>) => void)>
    onSetup: (
        (() => void)
        | ((ecs: Ecs<Components, Archetypes, Queries, Jobs>) => void)
    ) | null
    readonly parallelJobs: Jobs

    constructor({
        name, 
        imports = [] as unknown as Packages,
        components,
        archetypes = {} as unknown as Archetypes,
        meta = {},
        onSetup = null,
        queries = {} as unknown as Queries,
        systems = {},
        parellelJobs = {} as unknown as Jobs
    }: {
        name: Name, imports?: Packages,
        components: Declared, 
        archetypes?: Archetypes,
        meta?: Record<string, string>,
        queries?: Queries
        onSetup?: (
            (() => void)
            | ((ecs: Ecs<Components, Archetypes, Queries, Jobs>) => void)
        ) | null
        systems?: Record<string, ((ecs: Ecs<Components, Archetypes, Queries, Jobs>) => void)>
        parellelJobs?: Jobs
    }) {
        this.name = name
        this.imports = imports
        this.components = components
        this.archetypes = archetypes
        this.meta = meta
        this.onSetup = onSetup
        this.queries = queries
        this.systems = systems
        this.parallelJobs = parellelJobs
    }
}

const externalPkg = new Package({
    name: "extern",
    components: {
        vec2: {x: "f32", y: "f32"},
    }
})

const physx = new Package({
    name: "physx",
    components: {
        vec4: {x: "f32", y: "f32", z: "f32", w: "f32"},
    }
})

const pkg = new Package({
    name: "pkg",
    imports: {externalPkg, physx},
    components: {
        vec3: {x: "f32", y: "f32", z: "f32"},
    },
    archetypes: {
        player: ["extern_vec2", "pkg_vec3"],
        enemy: ["physx_vec4", "extern_vec2", "pkg_vec3"]
    },
    queries: {
        externVec: ["extern_vec2"],
        allVec: ["extern_vec2", "physx_vec4", "pkg_vec3"]
    },
    onSetup: ({createEntity}) => {
        createEntity("player")
            .extern_vec2({x: 1.0, y: 2.0})
            .pkg_vec3({x: 1.0, y: 1.0, z: 1.0})
            .commit()
        createEntity("enemy")
            .physx_vec4({x: 1.0, y: 1.0, z: 1.0, w: 1.0})
            .extern_vec2({x: 0.0, y: 0.0})
            .commit()
    },
    parellelJobs: {
        raytrace: () => {
            console.log("tracing")
        }
    },
    systems: {
        collisionDetection: ({query}) => {
            const q = query("externVec")
            q.iter()
        },
        rayTracing: ({query}) => {
            query("allVec").paraIter("raytrace")
        }
    }
})
