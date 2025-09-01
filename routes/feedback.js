// Feedback routes - Product feedback system ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const Feedback = require('../models/Feedback'); // Feedback model
const Product = require('../models/Product'); // Product model
const { isAuthenticated } = require('../middleware/auth'); // Authentication middleware

// POST - Product ke liye feedback submit karne ka route
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { productId, comment } = req.body; // Request body se data nikalo
        
        // Input validation - productId aur comment check karo
        if (!productId || !comment || comment.trim().length === 0) {
            return res.redirect(`/products/${productId}?error=Please provide a valid comment`);
        }
        
        // Product exist karta hai ya nahi check karo - sirf approved products
        const product = await Product.findOne({ _id: productId, status: 'approved' });
        if (!product) {
            return res.redirect('/products?error=Product not found');
        }
        
        // Check karo ke user ne pehle se feedback diya hai ya nahi
        const existingFeedback = await Feedback.findOne({
            user: req.session.user.id, // Current user
            product: productId // Is product ke liye
        });
        
        if (existingFeedback) {
            // Agar pehle se feedback hai to error message
            return res.redirect(`/products/${productId}?error=You have already submitted feedback for this product`);
        }
        
        // Naya feedback create karo
        const feedback = new Feedback({
            user: req.session.user.id, // User ID
            product: productId, // Product ID
            comment: comment.trim() // Comment (spaces remove kar ke)
        });
        
        await feedback.save(); // Database mein save karo
        
        // Success message ke saath product page par redirect karo
        res.redirect(`/products/${productId}?message=Feedback submitted successfully`);
        
    } catch (error) {
        console.error('Error submitting feedback:', error); // Error log karo
        // Error page par redirect karo
        res.redirect(`/products/${req.body.productId || ''}?error=Failed to submit feedback`);
    }
});

// GET - Specific product ke liye saare feedbacks get karne ka API endpoint
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params; // URL se product ID nikalo
        
        // Product ke saare feedbacks find karo
        const feedbacks = await Feedback.find({ product: productId })
            .populate('user', 'name email') // User details populate karo (name aur email)
            .sort({ createdAt: -1 }); // Latest feedback pehle (descending order)
        
        res.json(feedbacks); // JSON response bhejo
        
    } catch (error) {
        console.error('Error fetching feedbacks:', error); // Error log karo
        // 500 status ke saath error response bhejo
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

// Router export karo
module.exports = router;
