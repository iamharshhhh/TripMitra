import { UserModel } from "../models/User.js";
import { IUser } from "../models/User.js";

export class UserRepository {
    static async findById(id: string) {
        return UserModel.findById(id).exec();
    }
    static async findByPhoneNumber(phoneNumber: string) {
        return UserModel.findOne({ phoneNumber: phoneNumber.trim() }).exec();
    }
    static async create(userData: IUser) {
        const user = new UserModel(userData);
        return user.save();
    }
    static async update(id: string, updateData: Partial<IUser>) {
        return UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).exec();
    }
    static async delete(id: string) {
        const result = await UserModel.findByIdAndDelete(id).exec();
        return result !== null;
    }
}
