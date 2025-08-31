// Order Model - E-commerce orders ke liye database schema
const mongoose = require('mongoose'); // MongoDB ODM

// Order item schema - har order item ki details
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId, // Product ka reference
        ref: 'Product', // Product model se link
        required: true // Zaroori field hai
    },
    name: {
        type: String, // Product ka naam (order time par save kiya gaya)
        required: true // Zaroori field hai
    },
    price: {
        type: Number, // Product ki price (order time par save ki gayi)
        required: true // Zaroori field hai
    },
    quantity: {
        type: Number, // Kitni quantity order ki gayi
        required: true, // Zaroori field hai
        min: 1 // Minimum 1 quantity honi chahiye
    },
    imageUrl: {
        type: String, // Product ki image URL (order time par save ki gayi)
        required: true // Zaroori field hai
    },
    category: {
        type: String, // Product ki category (order time par save ki gayi)
        required: true // Zaroori field hai
    }
});

// Main order schema - complete order ki details
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // User ka reference jo order place kiya
        ref: 'User', // User model se link
        required: true // Zaroori field hai
    },
    items: [orderItemSchema], // Order mein jo items hain (array of orderItemSchema)
    shippingDetails: { // Shipping address ki details
        fullName: {
            type: String, // Customer ka pura naam
            required: true // Zaroori field hai
        },
        email: {
            type: String, // Customer ka email
            required: true // Zaroori field hai
        },
        address: {
            type: String, // Complete address
            required: true // Zaroori field hai
        },
        city: {
            type: String, // Sheher ka naam
            required: true // Zaroori field hai
        },
        state: {
            type: String, // State/Province
            required: true // Zaroori field hai
        },
        zipCode: {
            type: String, // Postal/ZIP code
            required: true // Zaroori field hai
        },
        country: {
            type: String, // Mulk ka naam
            required: true // Zaroori field hai
        }
    },
    paymentMethod: {
        type: String, // Payment ka tareeqa
        required: true, // Zaroori field hai
        enum: ['jazzcash', 'bank_transfer', 'cash_on_delivery'] // Sirf yeh methods allowed hain
    },
    paymentDetails: { // Payment ki complete details
        jazzcashNumber: {
            type: String // JazzCash number (agar JazzCash payment hai)
        },
        bankTransferDetails: { // Bank transfer ki details
            accountTitle: String, // Account holder ka naam
            accountNumber: String, // Account number
            bankName: String, // Bank ka naam
            transactionId: String // Transaction ID
        },
        transactionScreenshot: {
            type: String // Upload kiye gaye screenshot ka path
        },
        paymentStatus: {
            type: String, // Payment ki status
            enum: ['pending', 'approved', 'rejected'], // Sirf yeh statuses allowed hain
            default: 'pending' // Default mein pending
        },
        adminNotes: {
            type: String // Admin ke notes payment ke baare mein
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId, // Kis admin ne approve kiya
            ref: 'User' // User model se link
        },
        approvedAt: {
            type: Date // Kab approve kiya gaya
        }
    },
    subtotal: {
        type: Number, // Items ka total (tax se pehle)
        required: true // Zaroori field hai
    },
    tax: {
        type: Number, // Tax amount
        required: true // Zaroori field hai
    },
    total: {
        type: Number, // Final total amount (subtotal + tax)
        required: true // Zaroori field hai
    },
    orderNumber: {
        type: String, // Unique order number tracking ke liye
        required: true, // Zaroori field hai
        unique: true // Har order ka alag number hona chahiye
    },
    status: {
        type: String, // Order ki current status
        required: true, // Zaroori field hai
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], // Allowed statuses
        default: 'pending' // Default mein pending
    },
    createdAt: {
        type: Date, // Order create hone ka time
        default: Date.now // Current time automatically set ho jaye ga
    }
});

// Order model export karo
module.exports = mongoose.model('Order', orderSchema); 