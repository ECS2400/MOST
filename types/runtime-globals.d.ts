/**
 * Globals shared by Expo/RN production code and Node typecheck profiles.
 * Included by tsconfig.node.json and tsconfig.mediator-client.json.
 */

declare global {
  const __DEV__: boolean;
}

export {};
