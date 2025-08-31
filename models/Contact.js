// Contact Model - Contact form messages ke liye database schema
const mongoose = require('mongoose'); // MongoDB ODM

// Contact schema define karo - contact form ki details
const contactSchema = new mongoose.Schema({
    name: {
        type: String, // Customer ka naam
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    email: {
        type: String, // Customer ka email
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    subject: {
        type: String, // Message ka subject
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    message: {
        type: String, // Customer ka message
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    createdAt: {
        type: Date, // Message create hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    }
});

// Contact model export karo
module.exports = mongoose.model('Contact', contactSchema);
