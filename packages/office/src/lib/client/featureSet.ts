import { RuntimeEnvironment } from '$lib/enums';
import { currentEnv } from '$lib/env';

enum FeatureState {
  Ready = 'ready',
  UnderDevelopment = 'under development',
  OnlyInProd = 'only in prod',
  StageAndProd = 'only in stage and prod',
  NotInProd = 'everywhere but in prod'
}

export enum FeatureName {
  Editor = 'editor',
  Dashboard = 'dashboard',
  UserBehavior = 'userBehavior',
  CookieBot = 'cookieBot'
}

/**
 * Define the Features interface to describe the shape of the features object.
 * Create a features object with a set of feature keys and their corresponding statuses.
 */
const features: Record<FeatureName, FeatureState> = {
  editor: FeatureState.UnderDevelopment,
  dashboard: FeatureState.UnderDevelopment,
  userBehavior: FeatureState.NotInProd,
  cookieBot: FeatureState.NotInProd
};

/**
 * Check if a feature should be used based on its status in the features object and the current environment.
 * @param featureId - The string identifier of the feature to check.
 * @returns true if the feature is ready or not found in the features object, or if the environment is 'dev' or 'test', false otherwise.
 */
export const shouldUseFeature = (featureId: FeatureName): boolean => {
  if (features[featureId] === FeatureState.Ready) {
    return true;
  }
  if (features[featureId] === FeatureState.OnlyInProd) {
    return currentEnv === RuntimeEnvironment.Prod;
  }

  if (features[featureId] === FeatureState.StageAndProd) {
    return currentEnv === RuntimeEnvironment.Prod || currentEnv === RuntimeEnvironment.Stage;
  }

  if (currentEnv === RuntimeEnvironment.Dev || currentEnv === RuntimeEnvironment.Test) {
    return true;
  }

  if (features[featureId] === FeatureState.NotInProd) {
    return currentEnv !== RuntimeEnvironment.Prod;
  }

  return false;
};