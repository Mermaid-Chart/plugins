import { InvalidEnumValueError } from './errors.js';

export enum RuntimeEnvironment {
  Dev = 'dev',
  Test = 'test',
  Stage = 'stage',
  Prod = 'prod'
}

export enum RawDiagramType {
  SVG = 'svg',
  HTML = 'html'
}

export enum MessageType {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Success = 'success'
}

export enum Tier {
  Free = 'free',
  Individual = 'individual',
  Pro = 'pro',
  Team = 'team',
  Enterprise = 'enterprise'
}

/**
 * Type guard for enum values
 * @param enumType Enum to check value against
 * @param value Value to check
 * @returns If value is a valid enum value
 *
 * @example
 * ```ts
 * const subType = res.data.subType;
 * if(isEnumValue(SubscriptionType, subType)) {
 *  // subType is a valid SubscriptionType
 *  // and can be passed to any functions expecting a SubscriptionType without having to cast it
 *   updateSubscription(subType)
 * }
 */
export function isEnumValue<T extends string>(
  enumType: Record<string, T>,
  value: string
): value is T {
  return Object.values(enumType).includes(value as T);
}

/**
 * Type guard for enum values which throws an error if the value is not valid
 * @param enumType Enum to check value against
 * @param value Value to check
 * @returns If value is a valid enum value
 * @throws {@link InvalidEnumValue}
 * @example
 * ```ts
 * const subscription: Subscription = {
 *  tier: validateEnumValue(SubscriptionTier, req.body.tier),
 *  state: validateEnumValue(SubscriptionStates, req.body.state),
 * };
 */
export function validateEnumValue<T extends string>(enumType: Record<string, T>, value: string): T {
  if (!isEnumValue(enumType, value)) {
    throw new InvalidEnumValueError(enumType, value);
  }
  return value;
}
