import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IClient extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  language: string;
  addresses: { label: string; address: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    // Preferences added for the settings redesign — plain stored fields,
    // no notification-sending or translation system reads these yet.
    notifyEmail: { type: Boolean, default: true },
    notifyPush: { type: Boolean, default: true },
    language: { type: String, default: "en" },
    // Saved pickup/delivery addresses (Settings > Saved Addresses).
    // Existing clients without this field just read back as [].
    addresses: {
      type: [new Schema({ label: String, address: String }, { _id: false })],
      default: [],
    },
  },
  { timestamps: true }
);

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);

export default Client;