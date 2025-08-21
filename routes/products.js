const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

// Get all products
router.get('/', async (req, res) => {
    try {
        let query = {};
        let pageTitle = 'All Products';
        
        // Filter by category if specified
        if (req.query.category) {
            query.category = req.query.category;
            pageTitle = req.query.category === 'men-clothing' ? "Men's Clothing" :
                        req.query.category === 'women-clothing' ? "Women's Clothing" :
                        req.query.category === 'accessories' ? "Accessories" :
                        req.query.category === 'electronics' ? "Electronics" : "Products";
        }
        
        // Handle search query
        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            const searchRegex = new RegExp(searchTerm, 'i');
            
            // Special case for "men" or "women" search to match their respective categories
            if (searchTerm.toLowerCase() === 'men') {
                query.category = 'men-clothing';
            } else if (searchTerm.toLowerCase() === 'women') {
                query.category = 'women-clothing';
            } else if (searchTerm.toLowerCase() === 'electronics' || searchTerm.toLowerCase() === 'electronic') {
                query.category = 'electronics';
            } else if (searchTerm.toLowerCase() === 'accessories' || searchTerm.toLowerCase() === 'accessory') {
                query.category = 'accessories';
            } else {
                // Standard search across multiple fields
                query.$or = [
                    { name: searchRegex },
                    { description: searchRegex }
                ];
                
                // Also check if the search term is part of a category name
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
            
            pageTitle = `Search Results: ${searchTerm}`;
        }
        
        // Handle featured products filter
        if (req.query.featured === 'true') {
            query.featured = true;
            pageTitle = 'Featured Products';
        }
        
        // Get products with optional filtering
        const products = await Product.find(query).sort({ createdAt: -1 });
        
        // Get user's wishlist if logged in
        let userWishlist = [];
        if (req.session && req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user && user.wishlist) {
                userWishlist = user.wishlist.map(id => id.toString());
            }
        }
        
        res.render('products/index', {
            title: pageTitle,
            products,
            currentCategory: req.query.category || 'all',
            searchQuery: req.query.search || '',
            userWishlist
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// Get product details
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('seller', 'name');
        
        if (!product) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found'
            });
        }
        
        // Get related products from same category
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id }
        }).limit(4);
        
        // Check if product is in user's wishlist
        let isInWishlist = false;
        if (req.session && req.session.user) {
            const user = await User.findById(req.session.user.id);
            if (user && user.wishlist) {
                isInWishlist = user.wishlist.some(id => id.toString() === req.params.id);
            }
        }
        
        // Get all feedbacks for this product
        const feedbacks = await Feedback.find({ product: req.params.id })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        
        res.render('products/details', {
            title: product.name,
            product,
            relatedProducts,
            isInWishlist,
            feedbacks
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

module.exports = router; 