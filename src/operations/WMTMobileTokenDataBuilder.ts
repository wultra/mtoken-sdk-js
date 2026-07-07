//
// Copyright 2026 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions
// and limitations under the License.
//

/**
 * Interface for structured records that can be stored in `mobileTokenData`
 * via `WMTMobileTokenDataBuilder`.
 *
 * Implementations define a `key` under which the record is stored and a `build()`
 * method that produces the serializable value.
 */
export interface WMTMobileTokenDataRecord {
    /** Key under which this record will be stored in the `mobileTokenData` dictionary. */
    readonly key: string

    /**
     * Produces the value to be stored for `key`. Must be JSON-serializable.
     * May return a `Promise` for async implementations.
     */
    build(): unknown | Promise<unknown>
}

/**
 * Builder for constructing the `mobileTokenData` dictionary that is sent
 * to the server during operation authorization or rejection.
 *
 * Supports both raw key-value pairs and structured `WMTMobileTokenDataRecord` instances.
 *
 * Usage:
 * ```typescript
 * const builder = new WMTMobileTokenDataBuilder()
 * builder.put("riskScore", 0.82)
 * await builder.putRecord(recorder) // WMTMobileTokenDataRecord
 * operation.mobileTokenData = builder.build()
 * ```
 */
export class WMTMobileTokenDataBuilder {

    private data: Record<string, unknown>

    /**
     * Creates a new builder with optional initial data.
     *
     * @param initialData Optional seed data to start with.
     */
    constructor(initialData?: Record<string, unknown>) {
        this.data = initialData ? { ...initialData } : {}
    }

    /**
     * Stores a key-value pair. Overwrites any existing entry with the same key.
     *
     * @param key A string key.
     * @param value The value to store.
     * @returns This builder for chaining.
     */
    put(key: string, value: unknown): this {
        this.data[key] = value
        return this
    }

    /**
     * Stores a structured record under its declared key.
     *
     * @param record A `WMTMobileTokenDataRecord` whose `build()` result will be stored.
     * @returns This builder for chaining.
     */
    async putRecord(record: WMTMobileTokenDataRecord): Promise<this> {
        this.data[record.key] = await record.build()
        return this
    }

    /**
     * Removes an entry by key or record.
     *
     * @param keyOrRecord A string key or a `WMTMobileTokenDataRecord`.
     * @returns `true` if the key existed and was removed.
     */
    remove(keyOrRecord: string | WMTMobileTokenDataRecord): boolean {
        const key = typeof keyOrRecord === "string" ? keyOrRecord : keyOrRecord.key
        if (key in this.data) {
            delete this.data[key]
            return true
        }
        return false
    }

    /**
     * Removes all entries.
     *
     * @returns This builder for chaining.
     */
    clear(): this {
        this.data = {}
        return this
    }

    /**
     * Returns a snapshot copy of the current data.
     *
     * Safe to assign directly to `operation.mobileTokenData`.
     */
    build(): Record<string, unknown> {
        return { ...this.data }
    }
}
