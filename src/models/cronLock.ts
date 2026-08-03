import { Schema, model, models } from "mongoose";

const cronLockSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    leaseUntil: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const CronLock = models.CronLock || model("CronLock", cronLockSchema);

export default CronLock;
