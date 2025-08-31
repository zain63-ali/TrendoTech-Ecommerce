// Cart model import kar rahe hain database operations ke liye
const Cart = require('../models/Cart');

// Middleware function - har request par cart data calculate karta hai
// Yeh function header mein cart count aur total dikhane ke liye use hota hai
const addCartData = async (req, res, next) => {
    try {
        let cartCount = 0; // Cart mein kitne items hain
        let cartTotal = '0.00'; // Cart ka total price
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database se cart data lao
            const cart = await Cart.findOne({ user: req.session.user.id }).populate('items.product');
            
            // Agar cart exist karta hai aur items hain
            if (cart && cart.items.length > 0) {
                cartCount = cart.getItemCount(); // Total items count
                const total = await cart.calculateTotal(); // Total price calculate karo
                cartTotal = total.toFixed(2); // 2 decimal places mein
            }
        } else {
            // User login nahi hai - session cart se data lao
            if (req.session.cart && req.session.cart.length > 0) {
                // Session cart mein items ki total quantity calculate karo
                cartCount = req.session.cart.reduce((count, item) => count + item.quantity, 0);
                
                // Session cart ka total price calculate karo
                const total = req.session.cart.reduce((sum, item) => {
                    return sum + (item.product.price * item.quantity);
                }, 0);
                cartTotal = total.toFixed(2);
            }
        }
        
        // Cart data ko response locals mein add karo
        // Yeh data templates mein available hoga
        res.locals.cartCount = cartCount;
        res.locals.cartTotal = cartTotal;
        
        // Next middleware ya route handler ko call karo
        next();
    } catch (err) {
        // Agar koi error aaye to console mein print karo
        console.error('Cart middleware error:', err);
        
        // Error ki case mein default values set karo
        res.locals.cartCount = 0;
        res.locals.cartTotal = '0.00';
        
        // Next middleware ko call karo
        next();
    }
};

// Middleware function export kar rahe hain
module.exports = { addCartData };
