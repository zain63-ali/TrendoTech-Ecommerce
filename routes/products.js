// Products routes - Product listing aur details ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const Product = require('../models/Product'); // Product model
const User = require('../models/User'); // User model
const Feedback = require('../models/Feedback'); // Feedback model

// GET - Saare products list karne ke liye route (filtering aur search ke saath)
router.get('/', async (req, res) => {
    try {
        let query = {}; // Database query object
        let pageTitle = 'All Products'; // Default page title
        
        // Category ke base par filter karo
        if (req.query.category) {
            query.category = req.query.category; // Category filter add karo
            // Page title category ke according set karo
            pageTitle = req.query.category === 'men-clothing' ? "Men's Clothing" :
                        req.query.category === 'women-clothing' ? "Women's Clothing" :
                        req.query.category === 'accessories' ? "Accessories" :
                        req.query.category === 'electronics' ? "Electronics" : "Products";
        }
        
        // Search functionality handle karo
        if (req.query.search) {
            const searchTerm = req.query.search.trim(); // Search term clean karo
            const searchRegex = new RegExp(searchTerm, 'i'); // Case-insensitive regex
            
            // Special cases - direct category matches
            if (searchTerm.toLowerCase() === 'men') {
                query.category = 'men-clothing'; // Men search = men-clothing category
            } else if (searchTerm.toLowerCase() === 'women') {
                query.category = 'women-clothing'; // Women search = women-clothing category
            } else if (searchTerm.toLowerCase() === 'electronics' || searchTerm.toLowerCase() === 'electronic') {
                query.category = 'electronics'; // Electronics search
            } else if (searchTerm.toLowerCase() === 'accessories' || searchTerm.toLowerCase() === 'accessory') {
                query.category = 'accessories'; // Accessories search
            } else {
                // General search - multiple fields mein search karo
                query.$or = [
                    { name: searchRegex }, // Product name mein search
                    { description: searchRegex } // Product description mein search
                ];
                
                // Partial category name matches bhi check karo
                if (searchTerm.toLowerCase().includes('men')) {
                    query.$or.push({ category: 'men-clothing' });
                }
                if (searchTerm.toLowerCase().includes('women')) {
                    query.$or.push({ category: 'women-clothing' });
                }
                if (searchTerm.toLowerCase().includes('electronic')) {
                    query.$or.push({ category: 'electronics' });
                }
                if (searchTerm.toLowerCase().includes('accessor')) {
                    query.$or.push({ category: 'accessories' });
                }
            }
            
            pageTitle = `Search Results: ${searchTerm}`; // Search results title
        }
        
        // Featured products filter
        if (req.query.featured === 'true') {
            query.featured = true; // Sirf featured products
            pageTitle = 'Featured Products';
        }
        
        // Database se products find karo (latest first)
        const products = await Product.find(query).sort({ createdAt: -1 });
        
        // User ka wishlist nikalo (agar login hai)
        let userWishlist = [];
        if (req.session && req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user && user.wishlist) {
                userWishlist = user.wishlist.map(id => id.toString()); // IDs ko string mein convert karo
            }
        }
        
        // Products page render karo
        res.render('products/index', {
            title: pageTitle,
            products, // Products list
            currentCategory: req.query.category || 'all', // Current selected category
            searchQuery: req.query.search || '', // Current search query
            userWishlist // User wishlist for heart icons
        });
    } catch (err) {
        console.error(err); // Error log karo
        // Error page render karo
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// GET - Single product ki details dikhane ke liye route
router.get('/:id', async (req, res) => {
    try {
        // Product find karo ID se aur seller details populate karo
        const product = await Product.findById(req.params.id).populate('seller', 'name');
        
        if (!product) {
            // Agar product nahi mila to 404 error
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found'
            });
        }
        
        // Same category ke related products find karo (current product exclude kar ke)
        const relatedProducts = await Product.find({
            category: product.category, // Same category
            _id: { $ne: product._id } // Current product exclude karo
        }).limit(4); // Maximum 4 products
        
        // Check karo ke product user ke wishlist mein hai ya nahi
        let isInWishlist = false;
        if (req.session && req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user && user.wishlist) {
                // Wishlist mein product ID find karo
                isInWishlist = user.wishlist.some(id => id.toString() === req.params.id);
            }
        }
        
        // Is product ke saare feedbacks find karo
        const feedbacks = await Feedback.find({ product: req.params.id })
            .populate('user', 'name') // User name populate karo
            .sort({ createdAt: -1 }); // Latest feedback pehle
        
        // Check karo ke current user ne feedback diya hai ya nahi
        let userFeedback = null;
        if (req.session && req.session.user) {
            userFeedback = await Feedback.findOne({
                user: req.session.user.id, // Current user
                product: req.params.id // Current product
            }).populate('user', 'name');
        }
        
        // Product details page render karo
        res.render('products/details', {
            title: product.name, // Page title product name
            product, // Product details
            relatedProducts, // Related products
            isInWishlist, // Wishlist status
            feedbacks, // All feedbacks
            userFeedback // Current user feedback (agar hai)
        });
    } catch (err) {
        console.error(err); // Error log karo
        // Error page render karo
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Router export karo
module.exports = router; 