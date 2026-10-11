import mongoose, { Schema, Document } from "mongoose";

export interface IDistributedLock extends Document {
    lockKey: string;
    ownerId: string;
    acquiredAt: Date;
    expiresAt: Date;
}

const DistributedLockSchema = new Schema({
    lockKey: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true },
    acquiredAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true }
});
export const DistributedLock = mongoose.model("DistributedLock", DistributedLockSchema, "distributed_locks");
