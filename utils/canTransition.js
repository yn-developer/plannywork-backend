import { JobStateTransitions } from "../domain/jobState";

export function canTransition(from, to) {
  const allowedNextStates = JobStateTransitions[from];
  return Array.isArray(allowedNextStates)
    ? allowedNextStates.includes(to)
    : false;
}
