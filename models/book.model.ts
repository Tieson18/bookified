import { IBook } from "@/types";
import { models, Schema, model } from "mongoose";

const BookSchema = new Schema<IBook>(
  {
    clerkId: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    author: { type: String, required: true },
    persona: { type: String },
    fileURL: { type: String, required: true },
    fileBlobKey: { type: String, required: true },
    coverURL: { type: String, required: true },
    coverBlobKey: { type: String },
    fileSize: { type: Number, required: true },
    totalSegments: { type: Number, default: 0 },
  },
  { timestamps: true },
);

BookSchema.index({ clerkId: 1, createdAt: -1 });
BookSchema.index({ clerkId: 1, slug: 1 }, { unique: true });

// Use existing model if it exists to prevent OverwriteModelError in development
const BookModel = models.Book || model<IBook>("Book", BookSchema);

export default BookModel;
