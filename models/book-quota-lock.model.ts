import { model, models, Schema } from "mongoose";

type BookQuotaLock = {
  _id: string;
  version: number;
};

const BookQuotaLockSchema = new Schema<BookQuotaLock>(
  {
    _id: { type: String, required: true },
    version: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const BookQuotaLockModel =
  models.BookQuotaLock ||
  model<BookQuotaLock>("BookQuotaLock", BookQuotaLockSchema);

export default BookQuotaLockModel;
