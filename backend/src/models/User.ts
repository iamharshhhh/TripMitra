import mongoose, { Schema } from "mongoose";
import { Document } from "mongoose";

export interface IUser {
    phoneNumber: string;
    name?: string;
    language?: string;
    homeLocation?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
}

const UserSchema = new Schema({
    phoneNumber: {
        type: String,
        required: [true, "Phone number is required"],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        trim: true
    },
    language: {
        type: String,
        default: "en",
        trim: true
    },
    homeLocation: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
export const UserModel = (mongoose.models.User as mongoose.Model<IUserDocument>) || mongoose.model<IUserDocument>("User", UserSchema);
