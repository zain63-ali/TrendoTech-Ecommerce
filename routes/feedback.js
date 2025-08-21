const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');

// POST - Submit feedback for a product
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { productId, comment } = req.body;
        
        // Validate input
        if (!productId || !comment || comment.trim().length === 0) {
            return res.redirect(`/products/${productId}?error=Please provide a valid comment`);
        }
        
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.redirect('/products?error=Product not found');
        }
        
        // Create new feedback
        const feedback = new Feedback({
            user: req.session.user.id,
            product: productId,
            comment: comment.trim()
        });
        
        await feedback.save();
        
        res.redirect(`/products/${productId}?message=Feedback submitted successfully`);
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.redirect(`/products/${req.body.productId || ''}?error=Failed to submit feedback`);
    }
});

// GET - Get all feedback for a specific product (API endpoint)
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        const feedbacks = await Feedback.find({ product: productId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        res.json(feedbacks);
        
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

module.exports = router;
