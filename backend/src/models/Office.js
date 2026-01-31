const mongoose = require('mongoose');

const OfficeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Office name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        code: {
            type: String,
            required: [true, 'Office code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: [2, 'Code must be at least 2 characters'],
            maxlength: [5, 'Code cannot exceed 5 characters'],
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            uppercase: true,
            trim: true,
            minlength: [2, 'Country code must be 2 characters'],
            maxlength: [2, 'Country code must be 2 characters'],
        },
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Office', OfficeSchema);
