import mongoose, { mongo } from "mongoose";
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const videoSchema = new mongoose.Schema(
    {
        vidoeFile: {
            type: String,//cloudnary url
            required: true
        },
        thumbnail: {
            type: String,
            required: true
        },
        tittle: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        views: {
            type: Number,
            default: 0,
        },
        ispublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }

    }, { timestamps: true }
)


videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model('Video', videoSchema)