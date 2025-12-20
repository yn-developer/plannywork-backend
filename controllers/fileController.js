import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const { v4: uuidv4 } = require("uuid");
import { S3Client } from "@aws-sdk/client-s3";
import { canDeleteFile, canReadFile } from "../utils/filePermissions";
import Job from "../model/Job";
import { canTransition } from "../utils/canTransition";
const s3 = new S3Client({ region: process.env.AWS_REGION });

const File = require("../model/File");
export const generateUploadUrls = async (req, res, next) => {
  const { jobId } = req.params;
  const files = req.body;

  const job = await Job.findById({ _id: jobId });
  if (!job) {
    return res.status(404).json({ message: "job not found" });
  }
  if (canTransition(job.status, "UPLOADING")) {
    job.status = "UPLOADING";
    await job.save();
  }
  const uploadUrls = await Promise.all(
    files.map(async (file) => {
      const key = `uploads/${uuidv4()}`;
      const record = await File.create({
        ownerId: userId,
        jobId: jobId,
        bucket: process.env.S3_BUCKET,
        s3Key: key,
        mimeType: file.type,
        size: file.size,
        originalName: file.name,
        status: "PENDING",
      });
      const command = new PutObjectCommand({
        Bucket: record.bucket,
        Key: record.s3Key,
        ContentType: record.mimeType,
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 120 });
      return {
        fileId: record._id,
        signedUrl,
        s3Key: record.s3Key,
      };
    })
  );
  res.status(200).json(uploadUrls);
};
export const generateDownloadUrl = async (req, res, next) => {
  const requestedFile = req.params.fileId;
  const file = await File.findById({ _id: requestedFile });
  if (!file) return res.status(404).json({ message: "file not found" });
  /* get user from session */
  if (!canReadFile(user, file)) {
    return res.status(403).json({ message: "permission not allowed" });
  }
  const command = new GetObjectCommand({
    Bucket: file.bucket,
    Key: file.s3Key,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 400 });
  res.json({ signedUrl });
};
export const fileDelete = async (req, res, next) => {
  const requestedFile = req.params.fileId;
  const file = await File.findById({ _id: requestedFile });
  if (!file) return res.status(404).json({ message: "file not found" });
  /* get user from session */
  if (!canDeleteFile(user, file)) {
    return res.status(403).json({ message: "permission not allowed" });
  }
  const command = new DeleteObjectCommand({
    Bucket: file.bucket,
    Key: file.s3Key,
  });
  await s3.send(command);
  await file.deleteOne();
  res.status(204).json({ message: "file deleted" });
};
