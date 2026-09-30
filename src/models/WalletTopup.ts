import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IWalletTopup {
  reference: string;
  firebaseUid: string;
  clientId?: Types.ObjectId;
  amountKobo: number;
  status: "pending" | "success" | "failed";
  paidAt?: Date;
  createdAt: Date;
}

// One row per top-up attempt. It ties a Paystack reference to the customer who
// started it, so nobody can claim someone else's payment.
const WalletTopupSchema = new Schema<IWalletTopup>(
  {
    reference: { type: String, required: true, unique: true },
    firebaseUid: { type: String, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId },
    amountKobo: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    paidAt: Date,
  },
  { timestamps: true }
);

const WalletTopup: Model<IWalletTopup> =
  (mongoose.models.WalletTopup as Model<IWalletTopup>) ||
  mongoose.model<IWalletTopup>("WalletTopup", WalletTopupSchema);

export default WalletTopup;