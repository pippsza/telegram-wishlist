import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICalendarEvent extends Document {
  owner: Types.ObjectId;
  // If set, this event is shared with the partner in that pair (both see it, both edit).
  // If null, it is a personal event visible only to the owner.
  pair?: Types.ObjectId;
  title: string;
  date: Date;
  isRecurringYearly: boolean;
  remindDaysBefore: number[];
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pair: { type: Schema.Types.ObjectId, ref: 'Pair', default: null, index: true },
    title: { type: String, required: true, maxlength: 200 },
    date: { type: Date, required: true },
    isRecurringYearly: { type: Boolean, default: false },
    remindDaysBefore: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr: number[]) => arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 365),
        message: 'remindDaysBefore must be integers between 0 and 365',
      },
    },
    note: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ owner: 1, date: 1 });
CalendarEventSchema.index({ pair: 1, date: 1 });

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
