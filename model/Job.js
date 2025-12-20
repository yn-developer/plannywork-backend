import mongoose from "mongoose";
import validator from "validator";

const JobSchema = new mongoose.Schema(
  {
    jobSheetNo: {
      type: String,
      validate(value) {
        if (!validator.isNumeric(value) || validator.isEmpty(value)) {
          throw Error("Invalid Entry");
        }
      },
      unique: true,
    },
    jobName: {
      type: String,
      validate(value) {
        if (validator.isNumeric(value) || validator.isEmpty(value)) {
          throw Error("Invalid Job Title");
        }
      },
    },
    jobDescription: {
      type: String,
      minlength: 6,
    },
    actionTaken: {
      type: String,
      minlength: 5,
    },
    company: {
      type: String,
      validate(value) {
        if (!validator.isLength(value, { min: 3, max: 100 })) {
          throw Error("No Short Form,Fill in Complete Company Name");
        }
      },
    },
    jobLocation: {
      type: String,
      default: "Yangon",
      required: true,
    },
    jobType: {
      type: String,
      enum: ["on-site", "remote", "ad-hoc"],
      default: "on-site",
    },
    status: {
      type: String,
      enum: ["completed", "ongoing"],
      default: "ongoing",
    },
    start: {
      type: String,
    },
    end: {
      type: String,
    },
    duration: {
      type: String,
    },
    jobDate: {
      type: Date,
      default: Date.now,
    },
    attachedFileName: {
      type: String,
    },
    jobState: {
      type: String,
      enum: ["DRAFT", "CREATED", "UPLOADING", "READY", "FAILED"],
      default: "CREATED",
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", JobSchema);
