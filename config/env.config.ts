// import dotenv from 'dotenv' throws an error. Replaced it by statement with star because dotenv lib isn't big, so it is safe solution.
import * as dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

function requireEnvVariable(envVariable: string): string {
  const envVariableValue = process.env[envVariable];

  if (envVariableValue === undefined) {
    throw new Error(`Environment variable ${envVariable} is not set.`);
  }

  return envVariableValue;
}

export const BASE_URL = requireEnvVariable('BASE_URL');
export const API_KEY = requireEnvVariable('API_KEY');