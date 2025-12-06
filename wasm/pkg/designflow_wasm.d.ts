/* tslint:disable */
/* eslint-disable */

/**
 * Fast color adjustment (brightness, contrast, saturation)
 */
export function adjust_colors(data: Uint8Array, brightness: number, contrast: number, saturation: number): void;

/**
 * Batch hit test for multiple shapes
 */
export function batch_hit_test(px: number, py: number, shapes_data: Float64Array, shape_count: number): number;

/**
 * High-performance image blur using box blur algorithm
 * Much faster than canvas filter for large images
 */
export function blur_image(data: Uint8Array, width: number, height: number, radius: number): Uint8Array;

/**
 * Optimized flood fill algorithm
 */
export function flood_fill(data: Uint8Array, width: number, height: number, start_x: number, start_y: number, fill_color: number, tolerance: number): boolean;

/**
 * Fast drop shadow generation
 */
export function generate_shadow(data: Uint8Array, width: number, height: number, offset_x: number, offset_y: number, blur_radius: number, shadow_color: number): Uint8Array;

export function init(): void;

/**
 * Fast distance calculation for hit testing
 */
export function line_distance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number;

/**
 * Point-in-polygon test for complex shapes
 */
export function point_in_polygon(px: number, py: number, vertices_x: Float64Array, vertices_y: Float64Array): boolean;

/**
 * Calculate bounding box for rotated rectangle
 */
export function rotated_bounds(x: number, y: number, width: number, height: number, angle: number): Float64Array;

/**
 * High-performance path smoothing for pen tool
 */
export function smooth_path(points_x: Float64Array, points_y: Float64Array, tension: number): Float64Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly blur_image: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly generate_shadow: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
  readonly flood_fill: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly smooth_path: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly adjust_colors: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
  readonly point_in_polygon: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly rotated_bounds: (a: number, b: number, c: number, d: number, e: number) => [number, number];
  readonly line_distance: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly batch_hit_test: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly init: () => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
