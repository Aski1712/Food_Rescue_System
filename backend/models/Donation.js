import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    expiryTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Available', 'Accepted', 'Rejected', 'Completed'],
      default: 'Available',
    },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], required: true },
      address: { type: String },
    },
  },
  { timestamps: true }
);

donationSchema.index({ location: '2dsphere' });

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
