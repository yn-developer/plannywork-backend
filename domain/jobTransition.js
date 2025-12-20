import Job from "../model/Job";
import { canTransition } from "../utils/canTransition";

if (canTransition(Job.status, "READY")) {
  Job.status = "READY";
  Job.save();
}
