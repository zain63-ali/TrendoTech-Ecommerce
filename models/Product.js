// Product Model - E-commerce products ke liye database schema
const mongoose = require('mongoose'); // MongoDB ODM

// Product schema define karo - product ki saari properties
const productSchema = new mongoose.Schema({
    name: {
        type: String, // Product ka naam
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    description: {
        type: String, // Product ki description
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    price: {
        type: Number, // Product ki price (paisay mein)
        required: true, // Zaroori field hai
        min: 0 // Negative price nahi ho sakti
    },
    category: {
        type: String, // Product ki category
        required: true, // Zaroori field hai
        enum: ['men-clothing', 'women-clothing', 'accessories', 'electronics'] // Sirf yeh categories allowed hain
    },
    imageUrl: {
        type: String, // Product ki image ka URL
        required: true // Zaroori field hai
    },
    inStock: {
        type: Boolean, // Product stock mein hai ya nahi
        default: true // Default mein stock available hai
    },
    featured: {
        type: Boolean, // Product featured hai ya nahi (homepage par dikhane ke liye)
        default: false // Default mein featured nahi hai
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId, // Seller ka reference
        ref: 'User' // User model se link hai
    },
    createdAt: {
        type: Date, // Product create hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    }
});

// Product model export karo
module.exports = mongoose.model('Product', productSchema);