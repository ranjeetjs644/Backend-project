import mongoose, { mongo, Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // one whi is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one to  who subscriber is subscribing
        ref: "User"
    },
}, { timestamps: true })


export const Subscription = mongoose.model('Subscription', subscriptionSchema)