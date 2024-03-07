import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, //cloudinary url
      requred: true,
    },
    thumbnail: {
      type: String, //cloudinary url
      requred: true,
    },
    title: {
      type: String,
      requred: true,
    },
    description: {
      type: String,
      requred: true,
    },
    duration: {
      type: Number,
      requred: true,
    },
    view: {
      type: Number,
      default: 0,
    },
    isPublish: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = model("Video", videoSchema);
