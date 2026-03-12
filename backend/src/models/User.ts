import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'designer' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  designCount: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:    { type: String, required: true, minlength: 6 },
    role:        { type: String, enum: ['designer', 'admin'], default: 'designer' },
    isActive:    { type: Boolean, default: true },
    lastLogin:   { type: Date },
    designCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method — compare password
UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

// Strip password from JSON responses
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { password: _, ...rest } = ret;
    return rest;
  },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
