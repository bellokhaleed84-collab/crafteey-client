import mongoose, { Schema, type Document, type Model } from "mongoose";
import { JOB_STATUS, type JobStatus } from "@/lib/constants";

export interface IJob extends Document {
  // Client side
  clientUid: string;
  clientName: string;
  clientPhone: string;

  // Job details, as submitted by the client
  category: string; // one of TRADE_OPTIONS
  issueType: string; // one of ISSUE_SUGGESTIONS[category], or "Other"
  description: string;
  area: string; // free-text address/area — no maps/GPS
  photoUrls: string[];
  videoUrls: string[];

  // Assigned by admin at dispatch time — null until then
  technicianUid: string | null;
  technicianName: string | null;
  technicianPhone: string | null;

  // Dispatch lifecycle
  status: JobStatus;
  qrToken: string; // generated at dispatch, scanned by the technician on arrival

  // Lifecycle timestamps, set as the job moves through status changes
  dispatchedAt: Date | null;
  onTheWayAt: Date | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    clientUid: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },

    category: { type: String, required: true },
    issueType: { type: String, required: true },
    description: { type: String, required: true },
    area: { type: String, required: true },
    photoUrls: { type: [String], default: [] },
    videoUrls: { type: [String], default: [] },

    technicianUid: { type: String, default: null },
    technicianName: { type: String, default: null },
    technicianPhone: { type: String, default: null },

    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PENDING,
    },
    qrToken: { type: String, default: null },

    dispatchedAt: { type: Date, default: null },
    onTheWayAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;