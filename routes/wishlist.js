// Wishlist routes - User wishlist functionality ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const User = require('../models/User'); // User model
const Product = require('../models/Product'); // Product model
const { isAuthenticated } = require('../middleware/auth'); // Authentication middleware

// Saare wishlist routes par authentication middleware apply karo
router.use(isAuthenticated);

// GET - Wishlist page dikhane ke liye route
router.get('/', async (req, res) => {
    try {
        // User find karo aur wishlist products populate karo
        const user = await User.findById(req.session.user.id)
            .populate('wishlist'); // Wishlist mein product details populate karo

        // Wishlist page render karo
        res.render('wishlist/index', {
            title: 'My Wishlist',
            wishlistItems: user.wishlist || [] // Wishlist items (empty array agar koi nahi)
        });
    } catch (err) {
        console.error('Wishlist error:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// POST - Wishlist mein item add karne ke liye route (AJAX)
router.post('/add/:productId', async (req, res) => {
    try {
        const productId = req.params.productId; // URL se product ID nikalo
        const userId = req.session.user.id; // Session se user ID nikalo

        // User find karo database se
        const user = await User.findById(userId);
        
        // Check karo ke product pehle se wishlist mein hai ya nahi
        if (user.wishlist.includes(productId)) {
            return res.json({
                success: true,
                message: 'Product is already in your wishlist',
                inWishlist: true
            });
        }
        
        // Product ko wishlist mein add karo
        user.wishlist.push(productId);
        await user.save(); // Database mein save karo
        
        // Session mein wishlist count update karo
        req.session.wishlistCount = user.wishlist.length;
        
        // Success response bhejo
        res.json({
            success: true,
            message: 'Product added to your wishlist',
            wishlistCount: user.wishlist.length, // Updated count
            inWishlist: true
        });
    } catch (err) {
        console.error('Add to wishlist error:', err); // Error log karo
        // Error response bhejo
        res.status(500).json({
            success: false,
            message: 'Server error, please try again later'
        });
    }
});

// DELETE - Wishlist se item remove karne ke liye route (AJAX)
router.delete('/remove/:productId', async (req, res) => {
    try {
        const productId = req.params.productId; // URL se product ID nikalo
        const userId = req.session.user.id; // Session se user ID nikalo
        
        // User ke wishlist se product remove karo
        await User.findByIdAndUpdate(userId, {
            $pull: { wishlist: productId } // MongoDB pull operator use kar ke remove karo
        });
        
        // Updated wishlist count nikalo
        const user = await User.findById(userId);
        req.session.wishlistCount = user.wishlist.length; // Session update karo
        
        // Success response bhejo
        res.json({
            success: true,
            message: 'Product removed from your wishlist',
            wishlistCount: user.wishlist.length, // Updated count
            inWishlist: false
        });
    } catch (err) {
        console.error('Remove from wishlist error:', err); // Error log karo
        // Error response bhejo
        res.status(500).json({
            success: false,
            message: 'Server error, please try again later'
        });
    }
});

// POST - Wishlist se item remove karne ke liye route (Form submission)
router.post('/remove/:productId', async (req, res) => {
    try {
        const productId = req.params.productId; // URL se product ID nikalo
        const userId = req.session.user.id; // Session se user ID nikalo
        
        // User ke wishlist se product remove karo
        await User.findByIdAndUpdate(userId, {
            $pull: { wishlist: productId } // MongoDB pull operator use kar ke remove karo
        });
        
        // Success message ke saath wishlist page par redirect karo
        res.redirect('/wishlist?message=Item removed from wishlist');
    } catch (err) {
        console.error('Remove from wishlist error:', err); // Error log karo
        // Error message ke saath wishlist page par redirect karo
        res.redirect('/wishlist?error=Server error, please try again');
    }
});

// Router export karo
module.exports = router;