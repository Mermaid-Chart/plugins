import { PUBLIC_ENVIRONMENT } from '$env/static/public';
import { validateEnumValue, RuntimeEnvironment } from './enums';

export const currentEnv = validateEnumValue(RuntimeEnvironment, PUBLIC_ENVIRONMENT);

export const getBaseURL = () => {
  switch (currentEnv) {
    case RuntimeEnvironment.Dev: {
      return 'http://localhost:3000';
      break;
    }
    case RuntimeEnvironment.Test: {
      return 'https://test.mermaidchart.com/office';
      break;
    }
    case RuntimeEnvironment.Stage: {
      return 'https://stage.mermaidchart.com/office';
      break;
    }
    case RuntimeEnvironment.Prod: {
      return 'https://www.mermaidchart.com/office';
      break;
    }
    default: {
      return 'https://www.mermaidchart.com/office';
    }
  }
};
