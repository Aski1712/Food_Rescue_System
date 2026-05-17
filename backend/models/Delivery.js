import mongoose from 'mongoose';

const deliveryStatusHistorySchema = new mongoose.Schema(
  {
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: [Number],
    },
  },
  { _id: true }
);

const deliverySchema = new mongoose.Schema(
  {
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Completed'],
      default: 'Pending',
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], default: [0, 0] },
    },
    pickupTime: Date,
    deliveryTime: Date,
    completionTime: Date,
    estimatedDeliveryTime: Date,
    statusHistory: [deliveryStatusHistorySchema],
    deliveryNotes: String,
    phone: String,
    distance: Number, // Distance in km
    duration: Number, // Estimated duration in minutes
  },
  { timestamps: true }
);

deliverySchema.index({ currentLocation: '2dsphere' });
deliverySchema.index({ status: 1 });
deliverySchema.index({ volunteer: 1, status: 1 });
deliverySchema.index({ recipient: 1, status: 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);
export default Delivery;
