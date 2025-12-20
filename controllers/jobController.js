import Job from "../model/Job.js";
import User from "../model/User.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/ErrorIndex.js";
import checkAuthorization from "../utils/checkAuthorization.js";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import autoCatch from "../utils/autoCatch.js";
const createJob = async (req, res, next) => {
  const { jobSheetNo, jobName, company, date } = req.body;
  const cleanDate = JSON.parse(date);
  const dateObj = new Date(cleanDate);
  const attachedFileName = req.file.filename;
  if (!jobSheetNo || !jobName || !company || !attachedFileName) {
    const error = new BadRequestError(`Please provide all fields`);
    return next(error);
  }
  const userEmail = req.session?.user?.email;
  const user = await User.findOne({ email: userEmail }).lean().exec();
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  const userId = user._id.toString();
  req.body.createdBy = userId;
  // req.body.attachedFileName = attachedFileName;
  req.body.jobState = "created";
  req.body.jobDate = dateObj;
  try {
    const job = await Job.create(req.body);
    if (job) {
      res.status(StatusCodes.CREATED).json({ job });
    }
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  // const session = await mongoose.startSession();
  const { id: jobId } = req.params;
  const { jobSheetNo, jobName } = req.body;
  const updateFields = req.body;
  if (!jobSheetNo || !jobName) {
    throw new BadRequestError("Please Provide all fields");
  }
  try {
    const job = await Job.findOne({ _id: jobId });
    if (!job) {
      throw new NotFoundError("No Job Found");
    }
    const oldFileName = job.attachedFileName;
    if (req.file) {
      const attachedFileName = req.file.filename;
      job.attachedFileName = attachedFileName;
    }
    Object.assign(job, updateFields);
    await job.save();
    // await session.commitTransaction();
    if (oldFileName && req.file) {
      const attachedFilePathClient = "./client/src/assets/uploads";
      const filePath = path.join(attachedFilePathClient, oldFileName);
      fs.unlink(filePath, function (err) {
        if (err) {
          throw err;
        }
      });
    }
    checkAuthorization(req.user, job.createdBy);
    res.status(StatusCodes.OK).json({ job });
  } catch (error) {
    // await session.abortTransaction();
    next(error);
  }
};
const getUserJobs = async (req, res) => {
  const userId = req.session.user.id;
  const jobs = await Job.find({ createdBy: userId });
  if (!jobs) {
    throw new NotFoundError("No Job Found");
  }
  res.status(StatusCodes.OK).json({ jobs });
};
const getAllJobs = async (req, res) => {
  const { status, jobType, sort, search, page } = req.query;
  const userEmail = req.session?.user?.email;
  const user = await User.findOne({ email: userEmail }).lean().exec();
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  let queryLimit = 10;
  let querySkip = 0;
  const pageNum = Number(page) || 1;
  // Todo: Add Role to queryObject
  const queryObject = {
    createdBy: user._id,
  };
  if (status && status !== "all") {
    queryObject.status = status;
  }
  if (jobType && jobType !== "all") {
    queryObject.jobType = jobType;
  }
  if (search) {
    queryObject.company = { $regex: search, $options: "i" };
  }
  let result = Job.find(queryObject);
  const totalJobs = await Job.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / queryLimit);
  if (sort === "latest") {
    result = result.sort("-jobDate");
  }
  if (sort === "oldest") {
    result = result.sort("jobDate");
  }
  if (sort === "a-z") {
    result = result.sort("position");
  }
  if (sort === "z-a") {
    result = result.sort("-position");
  }
  querySkip = (pageNum - 1) * queryLimit;
  result = result.skip(querySkip).limit(queryLimit);
  const jobs = await result;
  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages });
};
const getJobDetail = async (req, res) => {
  const { id: jobId } = req.params;
  try {
    const job = await Job.findById({ _id: jobId });
    if (!job) {
      throw new NotFoundError("job not found");
    }
    res.status(200).json({ job });
  } catch (error) {
    console.log(error);
  }
};
const getStats = async (req, res) => {
  const userEmail = req.session?.user?.email;
  const user = await User.findOne({ email: userEmail }).lean().exec();
  console.log(userEmail, user);
  // const userId = user._id.toString();
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  let stats = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(user._id) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  /* desctructure value from curr _id set alias as title, count has no  alias.curr value hold value in the array as iterated.{} to return as JSON. */
  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  }, {});
  const defaultStats = {
    ongoing: stats.ongoing || 0,
    completed: stats.completed || 0,
  };
  let monthlyJobSheets = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(user._id) } },
    {
      $group: {
        _id: { year: { $year: "$jobDate" }, month: { $month: "$jobDate" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    /* Limiting query to get last three months */
    { $limit: 4 },
  ]);
  let weeklyJobSheets = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(user._id) } },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$jobDate" },
          week: { $isoWeek: "$jobDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.week": -1 } },
  ]);
  let dailyJobSheets = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(user._id) } },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$jobDate" },
          month: { $month: "$jobDate" },
          year: { $year: "$jobDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    { $limit: 2 },
  ]);
  res
    .status(StatusCodes.OK)
    .json({ defaultStats, monthlyJobSheets, weeklyJobSheets, dailyJobSheets });
};
const deleteJob = async (req, res) => {
  const { id: jobId } = req.params;
  const job = await Job.findOne({ _id: jobId });
  if (!job) {
    throw new NotFoundError("No Job Found");
  }
  checkAuthorization(req.user, job.createdBy);
  const attachedFilePathClient = `./client/src/assets/uploads`;
  const filePath = path.join(attachedFilePathClient, job.attachedFileName);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log("issue with deleting file");
    }
  });
  await job.remove();
  res.status(StatusCodes.OK).json({ msg: "Job Deleted" });
};
export {
  createJob,
  getUserJobs,
  getAllJobs,
  getJobDetail,
  getStats,
  deleteJob,
  updateJob,
};
