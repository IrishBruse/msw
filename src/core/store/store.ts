import { invariant } from 'outvariant'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { InternalError } from '../utils/internal/devUtils'
import { HttpResponse } from '../HttpResponse'

type CollectionsDefinition = {
  [collectionName: string]: StandardSchemaV1
}

class Store<Collections extends CollectionsDefinition> {
  private collectionDefinitions: Collections
  private collectionNames: Array<keyof Collections>
  private collections: Map<keyof Collections, Collection<any>>

  constructor(options: { collections: Collections }) {
    this.collectionDefinitions = options.collections
    this.collectionNames = Object.keys(options.collections)
    this.collections = new Map()
  }

  /**
   * Opens a new collection.
   * If the collection already exists, returns its reference.
   */
  public open<Name extends keyof Collections>(
    name: Name,
  ): Collection<StandardSchemaV1.InferInput<Collections[Name]>> {
    const collectionDefinition = this.collectionDefinitions[name]

    invariant(
      collectionDefinition,
      'Failed to open a store: expected a known collection (%s) but got "%s"',
      this.collectionNames.join(', '),
      name,
    )

    const existingCollection = this.collections.get(name)

    if (existingCollection) {
      return existingCollection
    }

    const newCollection = new Collection<any>({
      name: name as any,
      schema: collectionDefinition,
    })
    this.collections.set(name, newCollection)

    return newCollection
  }
}

type CollectionPredicate<V> = (value: V, key: string) => boolean

class Collection<V> {
  private name: string
  private records: Map<string, V>
  private schema: StandardSchemaV1<V>

  constructor(args: { name: string; schema: StandardSchemaV1<V> }) {
    this.name = args.name
    this.schema = args.schema
    this.records = new Map()
  }

  /**
   * Returns the record with the given key.
   */
  public get(key: string): V | undefined {
    return this.records.get(key)
  }

  /**
   * Adds a new record to this collection.
   * If the record by this key already exists, overrides the record.
   */
  public async put(key: string, record: V): Promise<V> {
    const validationResult = await this.schema['~standard'].validate(record)

    invariant.as(
      InternalError,
      validationResult.issues == null,
      `\
Failed to put record with key "%s" to the collection "%s": provided input does not match the schema.

Input: %o

Validation error:`,
      key,
      this.name,
      record,
      JSON.stringify(validationResult.issues, null, 2),
    )

    this.records.set(key.toString(), validationResult.value)
    return validationResult.value
  }

  /**
   * Returns the first record matching the given predicate.
   */
  public findFirst(predicate: CollectionPredicate<V>): V | undefined {
    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        return value
      }
    }
  }

  /**
   * Returns all records matching the given predicate.
   */
  public findMany(predicate: CollectionPredicate<V>): Array<V> {
    const results: Array<V> = []

    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        results.push(value)
      }
    }

    return results
  }

  public update(
    predicate: CollectionPredicate<V>,
    updateFn: (value: V, key: string) => V,
  ): V {
    let foundKey: string | undefined
    const record = this.findFirst((value, key) => {
      if (predicate(value, key)) {
        foundKey = key
        return true
      }
      return false
    })

    if (record == null) {
      throw HttpResponse.json(
        { error: `Failed to update a record in "${this.name}": not found` },
        { status: 404 },
      )
    }

    invariant(
      foundKey,
      'Failed to update a record in "%s": corrupted key. Please report this as a bug on GitHub.',
      this.name,
    )

    const nextRecord = updateFn(record, foundKey)
    this.records.set(foundKey, nextRecord)
    return nextRecord
  }

  /**
   * Deletes a record with the given key from this collection.
   */
  public delete(key: string): void {
    this.records.delete(key)
  }

  /**
   * Deletes all records matching the given predicate.
   * Returns an array of deleted records.
   */
  public deleteMany(predicate: CollectionPredicate<V>): Array<V> {
    const deletedRecords: Array<V> = []

    for (const [key, value] of this.records) {
      if (predicate(value, key)) {
        this.records.delete(key)
        deletedRecords.push(value)
      }
    }

    return deletedRecords
  }

  /**
   * Clears the entire collection, deleting all its records.
   */
  public clear(): void {
    this.records.clear()
  }
}

export function defineStore<C extends CollectionsDefinition>(options: {
  collections: C
}) {
  return new Store({
    collections: options.collections,
  })
}
