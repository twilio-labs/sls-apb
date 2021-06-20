export interface ApbConfig {
  logging?: boolean;
  playbooksFolder?: string;
}

export interface StateMachineYaml {
  Resources: object;
  Outputs: object;
}

export interface SlsApbVariableResolutionHelper {
  statesExecutionRole: string;
  renderedPlaybooks: object;
}
