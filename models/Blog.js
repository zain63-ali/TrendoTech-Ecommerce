// Blog Model - Blog system ke liye database schema
const mongoose = require('mongoose'); // MongoDB ODM

// Blog schema define karo - blog posts ki details
const blogSchema = new mongoose.Schema({
    title: {
        type: String, // Blog post ka title
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    content: {
        type: String, // Blog post ka complete content
        required: true // Zaroori field hai
    },
    summary: {
        type: String, // Blog post ka short summary
        required: true, // Zaroori field hai
        trim: true // Extra spaces remove karo
    },
    imageUrl: {
        type: String, // Blog post ki featured image URL
        required: true // Zaroori field hai
    },
    author: {
        type: mongoose.Schema.Types.ObjectId, // Blog author ka reference
        ref: 'User', // User model se link
        required: true // Zaroori field hai
    },
    category: {
        type: String, // Blog post ki category
        enum: ['fashion', 'technology', 'lifestyle', 'business'], // Sirf yeh categories allowed hain
        required: true // Zaroori field hai
    },
    tags: [{ // Blog post ke tags (array)
        type: String, // Tag name
        trim: true // Extra spaces remove karo
    }],
    views: {
        type: Number, // Blog post kitni baar dekha gaya
        default: 0 // Default mein 0 views
    },
    isPublished: {
        type: Boolean, // Blog post publish hai ya draft
        default: true // Default mein published
    },
    createdAt: {
        type: Date, // Blog post create hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    },
    updatedAt: {
        type: Date, // Blog post last update hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    }
});

// Blog model export karo
module.exports = mongoose.model('Blog', blogSchema); 