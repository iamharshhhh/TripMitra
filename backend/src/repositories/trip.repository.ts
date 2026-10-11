import { TripModel } from "../models/Trip.js";
import { ITrip } from "../models/Trip.js";

export class TripRepository {
    static async findById(id: string) {
        return TripModel.findById(id).exec();
    }
    static async findByUserId(userId: string) {
        return TripModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }
    static async findActiveByUserId(userId: string) {
        return TripModel.findOne({
            userId,
            status: { $in: ["planning", "confirmed", "active"] }
        })
            .sort({ updatedAt: -1 })
            .exec();
    }
    static async create(tripData: Partial<ITrip>) {
        const trip = new TripModel(tripData);
        return trip.save();
    }
    static async update(id: string, updateData: Partial<ITrip>) {
        return TripModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).exec();
    }
    static async saveItinerary(id: string, updateData: any, expectedVersion?: number) {
        const query: any = { _id: id };
        if (expectedVersion !== undefined) {
            query.itineraryVersion = expectedVersion;
        }
        return TripModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).exec();
    }
    static async getItinerary(tripId: string) {
        const trip = await this.findById(tripId);
        return (trip as any)?.itinerarySnapshot || null;
    }
    static async resetTripForNewDestination(id: string, destination: string, destinationSlug: string) {
        return TripModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    destination,
                    destinationSlug,
                    planningState: "collecting_requirements",
                    itinerary: [],
                    itinerarySnapshot: undefined,
                    itineraryVersion: 1
                }
            },
            { new: true, runValidators: true }
        ).exec();
    }
    static async updateRequirements(id: string, requirements: any, planningState?: string) {
        const updateData: any = { requirements };
        if (planningState) {
            updateData.planningState = planningState;
        }
        return TripModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).exec();
    }
}
