import mongoose, { Schema, type Model, type Types } from "mongoose";

export type CompanyRequestStatus = "open" | "closed";

export interface ICompanyRequest {
  clientUid: string;
  clientName: string;
  companyId: Types.ObjectId;
  title: string;
  description: string;
  area: string;
  status: CompanyRequestStatus;
  conversationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyRequestSchema = new Schema<ICompanyRequest>(
  {
    clientUid: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    area: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    conversationId: { type: String },
  },
  { timestamps: true }
);

const CompanyRequest: Model<ICompanyRequest> =
  (mongoose.models.CompanyRequest as Model<ICompanyRequest>) ||
  mongoose.model<ICompanyRequest>("CompanyRequest", CompanyRequestSchema);

export default CompanyRequest;