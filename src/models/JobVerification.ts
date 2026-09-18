import mongoose, { Schema, Model, Types } from "mongoose";

/**
 * One document per job. Copy this file into BOTH crafteey-client and the technician app
 * (src/models/JobVerification.ts). Both apps use the same MongoDB database.
 *
 * Nothing here is ever sent to a device except the timestamps and duration.
 * Token hashes never leave the server.
 */
export interface IJobVerification {
  jobId: Types.ObjectId;

  // Stage 1: start
  startTokenHash: string | null;
  startTokenExpiresAt: Date | null;
  startedAt: Date | null; // server time, set only by the verify route
  startedByUid: string | null; // technician who scanned

  // Stage 2: completion (token is only ever created AFTER startedAt is set)
  completeTokenHash: string | null;
  completeTokenExpiresAt: Date | null;
  completedAt: Date | null; // server time, set only by the verify route
  completedByUid: string | null;

  durationSeconds: number | null; // completedAt - startedAt, computed on the server

  createdAt: Date;
  updatedAt: Date;
}

const JobVerificationSchema = new Schema<IJobVerification>(
  {
    jobId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },

    startTokenHash: { type: String, default: null, index: true },
    startTokenExpiresAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    startedByUid: { type: String, default: null },

    completeTokenHash: { type: String, default: null, index: true },
    completeTokenExpiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedByUid: { type: String, default: null },

    durationSeconds: { type: Number, default: null },
  },
  { timestamps: true }
);

const JobVerification: Model<IJobVerification> =
  (mongoose.models.JobVerification as Model<IJobVerification>) ||
  mongoose.model<IJobVerification>("JobVerification", JobVerificationSchema);

export default JobVerification;