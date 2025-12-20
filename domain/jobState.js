export const JobStates = {
  DRAFT: "DRAFT",
  CREATED: "CREATED",
  UPLOADING: "UPLOADING",
  READY: "READY",
  FAILED: "FAILED",
};
export const JobStateTransitions = {
  DRAFT: ["CREATED"],
  CREATED: ["UPLOADING", "FAILED"],
  UPLOADING: ["READY", "FAILED"],
  READY: [],
  FAILED: [],
};
