// Feedback Model - Product feedback system ke liye database schema
const mongoose = require('mongoose'); // MongoDB ODM

// Feedback schema define karo - product feedback ki details
const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // User ka reference jo feedback diya
        ref: 'User', // User model se link
        required: true // Zaroori field hai
    },
    product: {
        type: mongoose.Schema.Types.ObjectId, // Product ka reference jis par feedback diya
        ref: 'Product', // Product model se link
        required: true // Zaroori field hai
    },
    comment: {
        type: String, // Feedback comment/review
        required: true, // Zaroori field hai
        trim: true, // Extra spaces remove karo
        maxlength: 1000 // Maximum 1000 characters allowed
    },
    createdAt: {
        type: Date, // Feedback create hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    }
});

// Database indexes - queries ko fast banane ke liye
feedbackSchema.index({ product: 1, createdAt: -1 }); // Product ke feedbacks latest first
feedbackSchema.index({ user: 1 }); // User ke saare feedbacks
// Compound unique index - har user sirf ek baar feedback de sakta hai per product
feedbackSchema.index({ user: 1, product: 1 }, { unique: true });

// Feedback model export karo
module.exports = mongoose.model('Feedback', feedbackSchema);
