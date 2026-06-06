import { IBookSegment } from "@/types";
import { models, Schema, model } from "mongoose";

const BookSegmentSchema = new Schema<IBookSegment>(
  {
    clerkId: { type: String, required: true },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    content: { type: String, required: true },
    segmentIndex: { type: Number, required: true, index: true },
    pageNumber: { type: Number, index: true },
    wordCount: { type: Number, required: true },
  },
  { timestamps: true },
);

// Compound index to ensure unique segmentIndex for each bookId and optimize queries by bookId and segmentIndex
BookSegmentSchema.index({ bookId: 1, segmentIndex: 1 }, { unique: true });
BookSegmentSchema.index({ bookId: 1, pageNumber: 1 });
BookSegmentSchema.index({ bookId: 1, content: "text" }); // Text index for content search within segments
// Use existing model if it exists to prevent OverwriteModelError in development
const BookSegmentModel =
  models.BookSegment || model<IBookSegment>("BookSegment", BookSegmentSchema);

export default BookSegmentModel;
