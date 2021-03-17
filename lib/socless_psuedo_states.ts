import { BaseState } from "./stepFunction";

export interface HelperState extends BaseState {
    Resource: string;
}