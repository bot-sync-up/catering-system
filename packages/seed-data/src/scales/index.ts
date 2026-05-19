import type { Scale, ScaleConfig } from "../context.js";
import { SMALL_CONFIG } from "./small.js";
import { MEDIUM_CONFIG } from "./medium.js";
import { LARGE_CONFIG } from "./large.js";

export const CONFIGS: Record<Scale, ScaleConfig> = {
  small: SMALL_CONFIG,
  medium: MEDIUM_CONFIG,
  large: LARGE_CONFIG,
};

export function getConfig(scale: Scale): ScaleConfig {
  return CONFIGS[scale];
}
