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

type PackageComponents<
    N extends string, 
    C extends ComponentsDeclaration
> = keyof {
    [key in keyof C as `${keyof C & string}_${N & string}`]: true
}

type Import = {
    readonly name: string, 
    readonly components: ComponentsDeclaration
}

type Imports = {
    readonly [key: string]: Import
} 

type ComponentImports<I extends Imports> = keyof {
    [key in keyof I as `${keyof I[key]["components"] & string}_${I[key]["name"]}`]: true
}

type ComponentScope<I extends Imports, N extends string, C extends ComponentsDeclaration> = (
    ComponentImports<I> | PackageComponents<N, C>
)

type y = PackageComponents<"pkg", {
    vec2: {x: "f32", y: "f32"},
}>

type ImportedComponentDeclarations<I extends Imports> = {
    [key in keyof I as `${keyof I[key]["components"] & string}_${I[key]["name"]}`]: (
        I[key]["components"][keyof I[key]["components"]]
    )
}

type ComponentsDeclarationWithName<
    Name extends string, 
    Components extends ComponentsDeclaration
> = {
    [key in keyof Components as `${key & string}_${Name & string}`]: Components[key]
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

type Ecs<
    C extends ComponentsDeclaration, 
    Archetypes extends Archetype<keyof C & string>,
    Name extends string
> = {
    createEntity: <
        T extends string & keyof Archetypes,
        Keys extends Archetypes[T][number]
    >(arch: `${T}_${Name}`) => EcsMutator<C, Keys>
}

type QueryDefs<ComponentNames extends string> = {
    readonly [key: string]: Readonly<ComponentNames[]>
}

type System = (params: {iter: () => void}) => void

type SystemDef = {
    query: string,
    fn: Function,
    parallel: boolean
}

type AliasList<Component extends string> = {
    readonly [key: string]: Component 
}

type AliasedComponents<
    Declared extends ComponentsDeclaration,
    Alias extends AliasList<keyof Declared & string>,
    Name extends string
> = {
    [key in keyof Alias as `${key & string}_${Name}`]: Declared[Alias[key]]
}

export class Package<
    Name extends string,
    Declared extends ComponentsDeclaration,
    Packages extends Imports,
    DeclaredComponent extends AllComponents<Packages, Declared, Name>,
    Aliases extends AliasList<keyof DeclaredComponent & string>,
    AliasedComponent extends AliasedComponents<DeclaredComponent, Aliases, Name>,
    Components extends DeclaredComponent & AliasedComponent, 
    Archetypes extends Archetype<keyof Components & string>,
    Queries extends QueryDefs<keyof Components & string>
> {
    
    readonly name: Name
    readonly imports: Packages
    readonly components: Declared
    readonly aliases: Aliases
    readonly archetypes: Archetypes
    readonly queries: Queries
    meta: Record<string, string>
    private _onSetup: (((ecs: Ecs<Components, Archetypes, Name>) => void)) | null
    private _systems: SystemDef[]

    constructor({
        name, 
        imports = {} as unknown as Packages,
        components = {} as unknown as Declared,
        aliases = {} as unknown as Aliases,
        archetypes = {} as unknown as Archetypes,
        meta = {},
        queries = {} as unknown as Queries,
    }: {
        name: Name, 
        imports?: Packages,
        components?: Declared,
        aliases?: Aliases,
        archetypes?: Archetypes,
        meta?: Record<string, string>,
        queries?: Queries
    }) {
        this.name = name
        this.imports = imports
        this.components = components
        this.aliases = aliases
        this.archetypes = archetypes
        this.queries = queries
        this.meta = meta
        this._onSetup = null
        this._systems = []
    }

    set setup(fn: ((ecs: Ecs<Components, Archetypes, Name>) => void) | null) {
        this._onSetup = fn
    }

    get setup() {
        return this._onSetup
    }

    system(q: keyof Queries & string, fn: System) {
        const query = this.name + q 
        this._systems.push({query, fn, parallel: false})
    }

    psystem(q: keyof Queries & string, fn: System) {
        const query = this.name + q
        this._systems.push({query, fn, parallel: true})
    }
}