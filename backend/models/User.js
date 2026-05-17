import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Donor', 'NGO', 'Volunteer', 'Admin'],
      default: 'Donor',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: function() {
        return this.role === 'Volunteer' ? 'pending' : 'approved';
      },
    },
    phone: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });

// Pre-save middleware to handle role changes
userSchema.pre('save', function(next) {
  if (this.isModified('role') && this.role === 'Volunteer') {
    this.status = 'pending';
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
