import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.SchemaType.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: mongoose.SchemaType.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
      unique: true,
    },
    originalName: { type: String },
    bucket: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
    },
    status: {
      type: String,
      enum: ["PENDING", "UPLOADING", "COMPLETED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("File", FileSchema);
