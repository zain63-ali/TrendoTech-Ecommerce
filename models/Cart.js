const mongoose = require('mongoose');

// Cart ka schema banaya hai jo MongoDB mein store hoga
// Ye schema har user ke liye alag cart banayega
const cartSchema = new mongoose.Schema({
    // User field - ye batata hai ke ye cart kis user ka hai
    user: {
        type: mongoose.Schema.Types.ObjectId, // User ki ID store karenge
        ref: 'User', // User model se reference lenge
        required: true, // Ye field zaroori hai, bina user ke cart nahi ban sakta
        unique: true // Har user ka sirf ek hi cart hoga
    },
    
    // Items array - is mein saray cart items honge
    items: [{
        // Product field - ye batata hai ke konsa product cart mein hai
        product: {
            type: mongoose.Schema.Types.ObjectId, // Product ki ID
            ref: 'Product', // Product model se reference
            required: true // Product zaroori hai
        },
        
        // Quantity - kitne pieces chahiye
        quantity: {
            type: Number, // Number type
            required: true, // Quantity zaroori hai
            min: 1, // Kam se kam 1 hona chahiye
            default: 1 // Agar kuch nahi diya to 1 set kar do
        },
        
        // AddedAt - kab add kiya tha ye product
        addedAt: {
            type: Date, // Date type
            default: Date.now // Current time automatically set hoga
        }
    }],
    
    // UpdatedAt - cart kab last time update hui thi
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Ye createdAt aur updatedAt automatically add kar deta hai
});

// Pre-save middleware - har save se pehle ye function chalega
// Ye updatedAt field ko current time set kar deta hai
cartSchema.pre('save', function(next) {
    this.updatedAt = Date.now(); // Current time set karo
    next(); // Agle step par jao
});

// Yeh method cart ka total price calculate karta hai
cartSchema.methods.calculateTotal = async function() {
    // Pehle products ki details load karo (populate)
    await this.populate('items.product');
    
    // Har item ka price * quantity kar ke total nikalo
    return this.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0); // 0 se start karo
};

// Yeh method cart mein kitne items hain wo count karta hai
cartSchema.methods.getItemCount = function() {
    // Har item ki quantity add kar ke total items nikalo
    return this.items.reduce((count, item) => count + item.quantity, 0);
};

// Cart model export kar rahe hain taki dusri files mein use kar sakein
module.exports = mongoose.model('Cart', cartSchema);
