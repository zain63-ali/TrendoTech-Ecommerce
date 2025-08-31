// Express framework import kar rahe hain web server banane ke liye
const express = require('express');
// Router banate hain jo different URLs handle karega
const router = express.Router();

// Database models import kar rahe hain
const Product = require('../models/Product'); // Products ki information ke liye
const Order = require('../models/Order'); // Orders ki information ke liye  
const Cart = require('../models/Cart'); // Cart ki information ke liye

// Authentication middleware - check karta hai user login hai ya nahi
const { isAuthenticated } = require('../middleware/auth');

// File upload ke liye libraries
const multer = require('multer'); // File upload handle karta hai
const path = require('path'); // File paths handle karta hai
const fs = require('fs'); // File system operations ke liye

// Multer configuration - file upload ke liye settings
const storage = multer.diskStorage({
    // Yeh function decide karta hai ke files kahan save karni hain
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/screenshots');
        // Agar folder exist nahi karta to banao
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); // Yeh path use karo
    },
    // Yeh function file ka naam decide karta hai
    filename: function (req, file, cb) {
        // Unique filename banate hain taki duplicate na ho
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'jazzcash-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Upload middleware banate hain jo file upload handle karega
const upload = multer({ 
    storage: storage, // Upar wali storage settings use karo
    limits: {
        fileSize: 5 * 1024 * 1024 // Maximum 5MB ki file allow hai
    },
    fileFilter: function (req, file, cb) {
        // Sirf image files allow hain
        if (file.mimetype.startsWith('image/')) {
            cb(null, true); // File accept karo
        } else {
            cb(new Error('Only image files are allowed!'), false); // Reject karo
        }
    }
});

// Helper function - user ka cart laane ya banane ke liye
async function getUserCart(userId) {
    // Database mein user ka cart dhundo aur products ki details bhi load karo
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    // Agar cart nahi mila to naya banao
    if (!cart) {
        cart = new Cart({ user: userId, items: [] }); // Empty cart banao
        await cart.save(); // Database mein save karo
    }
    return cart; // Cart return karo
}

// Cart page dikhane ke liye route - GET /cart
router.get('/', async (req, res) => {
    try {
        let cartItems = []; // Cart ki items ki list
        let cartTotal = 0; // Cart ka total price
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database se cart lao
            const cart = await getUserCart(req.session.user.id);
            
            // Cart items ko proper format mein convert karo
            cartItems = cart.items.map(item => ({
                product: item.product, // Product ki details
                quantity: item.quantity // Kitni quantity hai
            }));
            
            // Total price calculate karo
            cartTotal = await cart.calculateTotal();
        } else {
            // User login nahi hai - session se cart lao
            if (!req.session.cart) req.session.cart = []; // Agar cart nahi hai to empty banao
            cartItems = req.session.cart;
            
            // Agar items hain to total calculate karo
            if (cartItems.length > 0) {
                cartTotal = cartItems.reduce((total, item) => {
                    return total + (item.product.price * item.quantity);
                }, 0);
            }
        }
        
        // Cart page render karo aur data pass karo
        res.render('cart/index', {
            title: 'Your Shopping Cart',
            cartItems: cartItems,
            cartTotal: cartTotal.toFixed(2) // 2 decimal places mein
        });
    } catch (err) {
        // Agar koi error aaye to console mein print karo
        console.error('Cart view error:', err);
        
        // Empty cart page dikhao error ke saath
        res.render('cart/index', {
            title: 'Your Shopping Cart',
            cartItems: [],
            cartTotal: '0.00',
            error: 'Error loading cart'
        });
    }
});

// Cart mein product add karne ke liye route - POST /cart/add
router.post('/add', async (req, res) => {
    try {
        // Request body se productId aur quantity nikalo
        const { productId, quantity = 1 } = req.body;
        console.log('Adding to cart:', productId, quantity);
        
        // Database se product ki details lao
        const product = await Product.findById(productId);
        if (!product) {
            // Agar product nahi mila to error return karo
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database mein cart save karo
            const cart = await getUserCart(req.session.user.id);
            
            // Check karo ke yeh product pehle se cart mein hai ya nahi
            const existingItemIndex = cart.items.findIndex(item => 
                item.product._id.toString() === productId.toString()
            );
            
            if (existingItemIndex > -1) {
                // Product pehle se hai - quantity badhao
                cart.items[existingItemIndex].quantity += parseInt(quantity);
            } else {
                // Naya product hai - cart mein add karo
                cart.items.push({
                    product: productId,
                    quantity: parseInt(quantity)
                });
            }
            
            // Cart ko database mein save karo
            await cart.save();
            // Products ki details load karo
            await cart.populate('items.product');
            
            // Total price aur items count calculate karo
            const cartTotal = await cart.calculateTotal();
            const cartCount = cart.getItemCount();
            
            // Success response bhejo
            res.json({ 
                success: true, 
                cartCount: cartCount,
                cartTotal: cartTotal.toFixed(2)
            });
        } else {
            // User login nahi hai - session cart use karo
            if (!req.session.cart) req.session.cart = [];
            
            // Check karo ke product pehle se session cart mein hai ya nahi
            const existingItemIndex = req.session.cart.findIndex(item => 
                item.product._id.toString() === productId.toString()
            );
            
            if (existingItemIndex > -1) {
                // Product pehle se hai - quantity badhao
                req.session.cart[existingItemIndex].quantity += parseInt(quantity);
            } else {
                // Naya product hai - session cart mein add karo
                req.session.cart.push({
                    product,
                    quantity: parseInt(quantity)
                });
            }
            
            // Session cart ka total calculate karo
            const cartTotal = req.session.cart.reduce((total, item) => {
                return total + (item.product.price * item.quantity);
            }, 0);
            
            // Success response bhejo
            res.json({ 
                success: true, 
                cartCount: req.session.cart.length,
                cartTotal: cartTotal.toFixed(2)
            });
        }
    } catch (err) {
        // Error ko console mein print karo
        console.error('Cart add error:', err);
        // Error response bhejo
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Cart se product remove karne ke liye route - POST /cart/remove
router.post('/remove', async (req, res) => {
    try {
        // Request body se productId nikalo
        const { productId } = req.body;
        console.log('Removing from cart:', productId);
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database se remove karo
            const cart = await getUserCart(req.session.user.id);
            
            // Cart items ko filter kar ke specified product ko remove karo
            cart.items = cart.items.filter(item => 
                item.product._id.toString() !== productId.toString()
            );
            
            // Updated cart ko database mein save karo
            await cart.save();
            // Products ki details load karo
            await cart.populate('items.product');
            
            // Naya total aur count calculate karo
            const cartTotal = await cart.calculateTotal();
            const cartCount = cart.getItemCount();
            
            // Success response bhejo
            res.json({ 
                success: true, 
                cartCount: cartCount,
                cartTotal: cartTotal.toFixed(2)
            });
        } else {
            // User login nahi hai - session cart se remove karo
            if (req.session && req.session.cart) {
                // Session cart ko filter kar ke product remove karo
                req.session.cart = req.session.cart.filter(item => 
                    item.product._id.toString() !== productId.toString()
                );
                
                // Session cart ka naya total calculate karo
                const cartTotal = req.session.cart.reduce((total, item) => {
                    return total + (item.product.price * item.quantity);
                }, 0);
                
                // Success response bhejo
                res.json({ 
                    success: true, 
                    cartCount: req.session.cart.length,
                    cartTotal: cartTotal.toFixed(2)
                });
            } else {
                // Agar session cart nahi hai to empty response bhejo
                res.json({ success: true, cartCount: 0, cartTotal: "0.00" });
            }
        }
    } catch (err) {
        // Error ko console mein print karo
        console.error('Cart remove error:', err);
        // Error response bhejo
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Pura cart clear karne ke liye route - POST /cart/clear
router.post('/clear', async (req, res) => {
    try {
        console.log('Clearing cart');
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database cart clear karo
            const cart = await getUserCart(req.session.user.id);
            cart.items = []; // Items array ko empty kar do
            await cart.save(); // Database mein save karo
        } else {
            // User login nahi hai - session cart clear karo
            if (req.session) {
                req.session.cart = []; // Session cart ko empty kar do
            }
        }
        
        // Success response bhejo
        res.json({ success: true, cartTotal: "0.00" });
    } catch (err) {
        // Error ko console mein print karo
        console.error('Clear cart error:', err);
        // Error response bhejo
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Cart item ki quantity update karne ke liye route - POST /cart/update-quantity
router.post('/update-quantity', async (req, res) => {
    try {
        // Request body se productId aur nai quantity nikalo
        const { productId, quantity } = req.body;
        console.log('Updating quantity:', productId, quantity);
        
        // Check karo ke user login hai ya nahi
        if (req.session.user) {
            // User login hai - database cart update karo
            const cart = await getUserCart(req.session.user.id);
            
            // Cart mein specified product dhundo
            const cartItem = cart.items.find(item => 
                item.product._id.toString() === productId.toString()
            );
            
            if (cartItem) {
                // Product mila - quantity update karo
                cartItem.quantity = parseInt(quantity);
                await cart.save(); // Database mein save karo
                await cart.populate('items.product'); // Product details load karo
                
                // Naya total aur item total calculate karo
                const cartTotal = await cart.calculateTotal();
                const itemTotal = cartItem.product.price * cartItem.quantity;
                
                // Success response bhejo
                res.json({ 
                    success: true, 
                    itemTotal: itemTotal.toFixed(2),
                    cartTotal: cartTotal.toFixed(2)
                });
            } else {
                // Product nahi mila
                res.json({ success: false, message: 'Item not found in cart' });
            }
        } else {
            // User login nahi hai - session cart update karo
            if (!req.session || !req.session.cart) {
                return res.json({ success: false, message: 'Cart not initialized' });
            }
            
            // Session cart mein product dhundo
            const cartItem = req.session.cart.find(item => 
                item.product._id.toString() === productId.toString()
            );
            
            if (cartItem) {
                // Product mila - quantity update karo
                cartItem.quantity = parseInt(quantity);
                
                // Session cart ka naya total calculate karo
                const cartTotal = req.session.cart.reduce((total, item) => {
                    return total + (item.product.price * item.quantity);
                }, 0);
                
                // Success response bhejo
                res.json({ 
                    success: true, 
                    itemTotal: (cartItem.product.price * cartItem.quantity).toFixed(2),
                    cartTotal: cartTotal.toFixed(2)
                });
            } else {
                // Product nahi mila
                res.json({ success: false, message: 'Item not found in cart' });
            }
        }
    } catch (err) {
        // Error ko console mein print karo
        console.error('Update quantity error:', err);
        // Error response bhejo
        res.json({ success: false, message: 'Error updating quantity' });
    }
});

// Checkout page dikhane ke liye route - GET /cart/checkout (sirf logged-in users ke liye)
router.get('/checkout', isAuthenticated, async (req, res) => {
    try {
        // Database se logged-in user ka cart lao
        const cart = await getUserCart(req.session.user.id);
        
        // Check karo ke cart mein items hain ya nahi
        if (!cart.items || cart.items.length === 0) {
            return res.redirect('/cart?error=Your cart is empty');
        }
        
        // Cart totals calculate karo
        const subtotal = await cart.calculateTotal(); // Items ka total price
        const tax = subtotal * 0.1; // 10% tax lagao
        const total = subtotal + tax; // Final total
        
        // Checkout page render karo aur data pass karo
        res.render('cart/checkout', {
            title: 'Checkout',
            cartItems: cart.items.map(item => ({
                product: item.product, // Product ki details
                quantity: item.quantity // Quantity
            })),
            subtotal: subtotal.toFixed(2), // 2 decimal places
            tax: tax.toFixed(2),
            total: total.toFixed(2),
            user: req.session.user // User ki information
        });
    } catch (err) {
        // Error ko console mein print karo
        console.error('Checkout page error:', err);
        // Cart page par redirect karo error ke saath
        res.redirect('/cart?error=Error loading checkout page');
    }
});

// Process checkout (place order)
router.post('/place-order', isAuthenticated, upload.single('transactionScreenshot'), async (req, res) => {
    try {
        const { 
            fullName, 
            email, 
            address, 
            city, 
            state, 
            zipCode, 
            country, 
            paymentMethod,
            jazzcashNumber,
            accountTitle,
            accountNumber,
            bankName,
            transactionId
        } = req.body;
        
        // Validate required fields
        if (!fullName || !email || !address || !city || !state || !zipCode || !country || !paymentMethod) {
            return res.redirect('/cart/checkout?error=Please fill in all required fields');
        }
        
        // Additional validation for JazzCash payment
        if (paymentMethod === 'jazzcash') {
            if (!jazzcashNumber) {
                return res.redirect('/cart/checkout?error=JazzCash number is required for JazzCash payment');
            }
            if (!req.file) {
                return res.redirect('/cart/checkout?error=Transaction screenshot is required for JazzCash payment');
            }
        }
        
        // Additional validation for Bank Transfer payment
        if (paymentMethod === 'bank_transfer') {
            if (!accountTitle || !accountNumber || !bankName || !transactionId) {
                return res.redirect('/cart/checkout?error=All bank transfer details are required');
            }
            if (!req.file) {
                return res.redirect('/cart/checkout?error=Transaction screenshot is required for bank transfer payment');
            }
        }
        
        // Get cart from database for logged-in user
        const cart = await getUserCart(req.session.user.id);
        
        if (!cart.items || cart.items.length === 0) {
            return res.redirect('/cart?error=Your cart is empty');
        }
        
        // Calculate totals
        const cartItems = cart.items;
        const subtotal = cartItems.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
        
        const tax = subtotal * 0.1;
        const total = subtotal + tax;
        
        // Create order items from cart
        const orderItems = cartItems.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            imageUrl: item.product.imageUrl,
            category: item.product.category
        }));
        
        // Generate unique order number
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Prepare payment details
        let paymentDetails = {};
        if (paymentMethod === 'jazzcash') {
            paymentDetails = {
                jazzcashNumber,
                transactionScreenshot: req.file ? `/uploads/screenshots/${req.file.filename}` : null,
                paymentStatus: 'pending'
            };
        } else if (paymentMethod === 'bank_transfer') {
            paymentDetails = {
                bankTransferDetails: {
                    accountTitle,
                    accountNumber,
                    bankName,
                    transactionId
                },
                transactionScreenshot: req.file ? `/uploads/screenshots/${req.file.filename}` : null,
                paymentStatus: 'pending'
            };
        }
        
        // Create the order in database
        const newOrder = new Order({
            user: req.session.user.id,
            items: orderItems,
            shippingDetails: {
                fullName,
                email,
                address,
                city,
                state,
                zipCode,
                country
            },
            paymentMethod,
            paymentDetails,
            subtotal,
            tax,
            total,
            orderNumber,
            status: 'pending'
        });
        
        await newOrder.save();
        
        // Clear the cart from database
        cart.items = [];
        await cart.save();
        
        // Redirect to order confirmation
        res.redirect('/cart/order-confirmation?orderId=' + newOrder._id);
    } catch (err) {
        console.error('Place order error:', err);
        res.redirect('/cart/checkout?error=An error occurred while processing your order: ' + err.message);
    }
});

// Order confirmation page
router.get('/order-confirmation', isAuthenticated, async (req, res) => {
    try {
        const orderId = req.query.orderId;
        
        if (!orderId) {
            return res.redirect('/my-orders');
        }
        
        // Fetch the order details
        const order = await Order.findOne({
            _id: orderId,
            user: req.session.user.id
        });
        
        if (!order) {
            return res.redirect('/my-orders');
        }
        
        res.render('cart/order-confirmation', {
            title: 'Order Confirmation',
            orderId: order.orderNumber,
            orderTotal: order.total.toFixed(2),
            order
        });
    } catch (err) {
        console.error('Order confirmation error:', err);
        res.redirect('/my-orders');
    }
});

module.exports = router; 