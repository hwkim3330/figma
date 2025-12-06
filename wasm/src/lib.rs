use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// High-performance image blur using box blur algorithm
/// Much faster than canvas filter for large images
#[wasm_bindgen]
pub fn blur_image(data: &[u8], width: u32, height: u32, radius: u32) -> Vec<u8> {
    let len = data.len();
    let mut output = data.to_vec();
    let mut temp = vec![0u8; len];

    let r = radius as i32;
    let w = width as i32;
    let h = height as i32;

    // Horizontal pass
    for y in 0..h {
        for x in 0..w {
            let mut r_sum = 0u32;
            let mut g_sum = 0u32;
            let mut b_sum = 0u32;
            let mut a_sum = 0u32;
            let mut count = 0u32;

            for dx in -r..=r {
                let nx = x + dx;
                if nx >= 0 && nx < w {
                    let idx = ((y * w + nx) * 4) as usize;
                    r_sum += data[idx] as u32;
                    g_sum += data[idx + 1] as u32;
                    b_sum += data[idx + 2] as u32;
                    a_sum += data[idx + 3] as u32;
                    count += 1;
                }
            }

            let idx = ((y * w + x) * 4) as usize;
            temp[idx] = (r_sum / count) as u8;
            temp[idx + 1] = (g_sum / count) as u8;
            temp[idx + 2] = (b_sum / count) as u8;
            temp[idx + 3] = (a_sum / count) as u8;
        }
    }

    // Vertical pass
    for y in 0..h {
        for x in 0..w {
            let mut r_sum = 0u32;
            let mut g_sum = 0u32;
            let mut b_sum = 0u32;
            let mut a_sum = 0u32;
            let mut count = 0u32;

            for dy in -r..=r {
                let ny = y + dy;
                if ny >= 0 && ny < h {
                    let idx = ((ny * w + x) * 4) as usize;
                    r_sum += temp[idx] as u32;
                    g_sum += temp[idx + 1] as u32;
                    b_sum += temp[idx + 2] as u32;
                    a_sum += temp[idx + 3] as u32;
                    count += 1;
                }
            }

            let idx = ((y * w + x) * 4) as usize;
            output[idx] = (r_sum / count) as u8;
            output[idx + 1] = (g_sum / count) as u8;
            output[idx + 2] = (b_sum / count) as u8;
            output[idx + 3] = (a_sum / count) as u8;
        }
    }

    output
}

/// Fast drop shadow generation
#[wasm_bindgen]
pub fn generate_shadow(
    data: &[u8],
    width: u32,
    height: u32,
    offset_x: i32,
    offset_y: i32,
    blur_radius: u32,
    shadow_color: u32, // RGBA packed
) -> Vec<u8> {
    let w = width as i32;
    let h = height as i32;
    let len = data.len();

    let sr = ((shadow_color >> 24) & 0xFF) as u8;
    let sg = ((shadow_color >> 16) & 0xFF) as u8;
    let sb = ((shadow_color >> 8) & 0xFF) as u8;
    let sa = (shadow_color & 0xFF) as u8;

    // Create shadow layer
    let mut shadow = vec![0u8; len];

    for y in 0..h {
        for x in 0..w {
            let src_x = x - offset_x;
            let src_y = y - offset_y;

            if src_x >= 0 && src_x < w && src_y >= 0 && src_y < h {
                let src_idx = ((src_y * w + src_x) * 4) as usize;
                let dst_idx = ((y * w + x) * 4) as usize;

                let alpha = data[src_idx + 3] as u32 * sa as u32 / 255;
                shadow[dst_idx] = sr;
                shadow[dst_idx + 1] = sg;
                shadow[dst_idx + 2] = sb;
                shadow[dst_idx + 3] = alpha as u8;
            }
        }
    }

    // Apply blur to shadow
    if blur_radius > 0 {
        blur_image(&shadow, width, height, blur_radius)
    } else {
        shadow
    }
}

/// Optimized flood fill algorithm
#[wasm_bindgen]
pub fn flood_fill(
    data: &mut [u8],
    width: u32,
    height: u32,
    start_x: u32,
    start_y: u32,
    fill_color: u32, // RGBA packed
    tolerance: u8,
) -> bool {
    let w = width as usize;
    let h = height as usize;
    let x = start_x as usize;
    let y = start_y as usize;

    if x >= w || y >= h {
        return false;
    }

    let fr = ((fill_color >> 24) & 0xFF) as u8;
    let fg = ((fill_color >> 16) & 0xFF) as u8;
    let fb = ((fill_color >> 8) & 0xFF) as u8;
    let fa = (fill_color & 0xFF) as u8;

    let start_idx = (y * w + x) * 4;
    let target_r = data[start_idx];
    let target_g = data[start_idx + 1];
    let target_b = data[start_idx + 2];
    let target_a = data[start_idx + 3];

    // Don't fill if already the fill color
    if target_r == fr && target_g == fg && target_b == fb && target_a == fa {
        return false;
    }

    let mut visited = vec![false; w * h];
    let mut stack = vec![(x, y)];

    while let Some((cx, cy)) = stack.pop() {
        let pixel_idx = cy * w + cx;
        if visited[pixel_idx] {
            continue;
        }

        let idx = pixel_idx * 4;

        // Inline match check
        let dr = (data[idx] as i16 - target_r as i16).abs() as u8;
        let dg = (data[idx + 1] as i16 - target_g as i16).abs() as u8;
        let db = (data[idx + 2] as i16 - target_b as i16).abs() as u8;
        let da = (data[idx + 3] as i16 - target_a as i16).abs() as u8;

        if !(dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance) {
            continue;
        }

        visited[pixel_idx] = true;
        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = fa;

        if cx > 0 { stack.push((cx - 1, cy)); }
        if cx < w - 1 { stack.push((cx + 1, cy)); }
        if cy > 0 { stack.push((cx, cy - 1)); }
        if cy < h - 1 { stack.push((cx, cy + 1)); }
    }

    true
}

/// High-performance path smoothing for pen tool
#[wasm_bindgen]
pub fn smooth_path(points_x: &[f64], points_y: &[f64], tension: f64) -> Vec<f64> {
    let n = points_x.len();
    if n < 2 {
        let mut result = Vec::with_capacity(n * 2);
        for i in 0..n {
            result.push(points_x[i]);
            result.push(points_y[i]);
        }
        return result;
    }

    // Catmull-Rom spline interpolation
    let mut result = Vec::new();
    let segments = 10; // Points per segment

    for i in 0..n - 1 {
        let p0_x = if i == 0 { points_x[0] } else { points_x[i - 1] };
        let p0_y = if i == 0 { points_y[0] } else { points_y[i - 1] };
        let p1_x = points_x[i];
        let p1_y = points_y[i];
        let p2_x = points_x[i + 1];
        let p2_y = points_y[i + 1];
        let p3_x = if i + 2 < n { points_x[i + 2] } else { points_x[n - 1] };
        let p3_y = if i + 2 < n { points_y[i + 2] } else { points_y[n - 1] };

        for j in 0..segments {
            let t = j as f64 / segments as f64;
            let t2 = t * t;
            let t3 = t2 * t;

            let x = tension * (
                (2.0 * p1_x) +
                (-p0_x + p2_x) * t +
                (2.0 * p0_x - 5.0 * p1_x + 4.0 * p2_x - p3_x) * t2 +
                (-p0_x + 3.0 * p1_x - 3.0 * p2_x + p3_x) * t3
            ) / 2.0;

            let y = tension * (
                (2.0 * p1_y) +
                (-p0_y + p2_y) * t +
                (2.0 * p0_y - 5.0 * p1_y + 4.0 * p2_y - p3_y) * t2 +
                (-p0_y + 3.0 * p1_y - 3.0 * p2_y + p3_y) * t3
            ) / 2.0;

            result.push(x);
            result.push(y);
        }
    }

    // Add last point
    result.push(points_x[n - 1]);
    result.push(points_y[n - 1]);

    result
}

/// Fast color adjustment (brightness, contrast, saturation)
#[wasm_bindgen]
pub fn adjust_colors(
    data: &mut [u8],
    brightness: f32,  // -1.0 to 1.0
    contrast: f32,    // -1.0 to 1.0
    saturation: f32,  // -1.0 to 1.0
) {
    let contrast_factor = (1.0 + contrast).powi(2);

    for i in (0..data.len()).step_by(4) {
        let mut r = data[i] as f32;
        let mut g = data[i + 1] as f32;
        let mut b = data[i + 2] as f32;

        // Brightness
        r += brightness * 255.0;
        g += brightness * 255.0;
        b += brightness * 255.0;

        // Contrast
        r = ((r - 128.0) * contrast_factor + 128.0);
        g = ((g - 128.0) * contrast_factor + 128.0);
        b = ((b - 128.0) * contrast_factor + 128.0);

        // Saturation
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + saturation * (r - gray);
        g = gray + saturation * (g - gray);
        b = gray + saturation * (b - gray);

        // Clamp
        data[i] = r.max(0.0).min(255.0) as u8;
        data[i + 1] = g.max(0.0).min(255.0) as u8;
        data[i + 2] = b.max(0.0).min(255.0) as u8;
    }
}

/// Point-in-polygon test for complex shapes
#[wasm_bindgen]
pub fn point_in_polygon(px: f64, py: f64, vertices_x: &[f64], vertices_y: &[f64]) -> bool {
    let n = vertices_x.len();
    if n < 3 {
        return false;
    }

    let mut inside = false;
    let mut j = n - 1;

    for i in 0..n {
        let xi = vertices_x[i];
        let yi = vertices_y[i];
        let xj = vertices_x[j];
        let yj = vertices_y[j];

        if ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
        j = i;
    }

    inside
}

/// Calculate bounding box for rotated rectangle
#[wasm_bindgen]
pub fn rotated_bounds(
    x: f64, y: f64, width: f64, height: f64, angle: f64
) -> Vec<f64> {
    let cos_a = angle.cos();
    let sin_a = angle.sin();

    let corners = [
        (0.0, 0.0),
        (width, 0.0),
        (width, height),
        (0.0, height),
    ];

    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    for (cx, cy) in corners.iter() {
        let rx = cx * cos_a - cy * sin_a + x;
        let ry = cx * sin_a + cy * cos_a + y;
        min_x = min_x.min(rx);
        min_y = min_y.min(ry);
        max_x = max_x.max(rx);
        max_y = max_y.max(ry);
    }

    vec![min_x, min_y, max_x - min_x, max_y - min_y]
}

/// Fast distance calculation for hit testing
#[wasm_bindgen]
pub fn line_distance(px: f64, py: f64, x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len_sq = dx * dx + dy * dy;

    if len_sq == 0.0 {
        return ((px - x1).powi(2) + (py - y1).powi(2)).sqrt();
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / len_sq;
    let t = t.max(0.0).min(1.0);

    let nearest_x = x1 + t * dx;
    let nearest_y = y1 + t * dy;

    ((px - nearest_x).powi(2) + (py - nearest_y).powi(2)).sqrt()
}

/// Batch hit test for multiple shapes
#[wasm_bindgen]
pub fn batch_hit_test(
    px: f64, py: f64,
    shapes_data: &[f64], // [type, x, y, w, h, rotation, ...]
    shape_count: usize,
) -> i32 {
    const SHAPE_SIZE: usize = 6;

    // Test from top (last) to bottom (first)
    for i in (0..shape_count).rev() {
        let offset = i * SHAPE_SIZE;
        if offset + SHAPE_SIZE > shapes_data.len() {
            continue;
        }

        let shape_type = shapes_data[offset] as i32;
        let x = shapes_data[offset + 1];
        let y = shapes_data[offset + 2];
        let w = shapes_data[offset + 3];
        let h = shapes_data[offset + 4];
        let rotation = shapes_data[offset + 5];

        // Transform point to shape's local coordinates
        let cx = x + w / 2.0;
        let cy = y + h / 2.0;
        let cos_r = (-rotation).cos();
        let sin_r = (-rotation).sin();
        let local_x = (px - cx) * cos_r - (py - cy) * sin_r + w / 2.0;
        let local_y = (px - cx) * sin_r + (py - cy) * cos_r + h / 2.0;

        let hit = match shape_type {
            0 => { // Rectangle
                local_x >= 0.0 && local_x <= w && local_y >= 0.0 && local_y <= h
            }
            1 => { // Ellipse
                let rx = w / 2.0;
                let ry = h / 2.0;
                let dx = local_x - rx;
                let dy = local_y - ry;
                (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0
            }
            _ => false
        };

        if hit {
            return i as i32;
        }
    }

    -1 // No hit
}
