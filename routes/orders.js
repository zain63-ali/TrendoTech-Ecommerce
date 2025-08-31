// Orders routes - User orders management ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const Order = require('../models/Order'); // Order model
const { isAuthenticated } = require('../middleware/auth'); // Authentication middleware

// Saare order routes par authentication middleware apply karo
router.use(isAuthenticated);

// GET - Current user ke saare orders dikhane ke liye route
router.get('/', async (req, res) => {
    try {
        // Debugging ke liye user ID log karo
        console.log('User ID from session:', req.session.user.id);
        
        // User ID validation
        if (!req.session.user || !req.session.user.id) {
            console.error('No user ID found in session');
            return res.redirect('/users/login?error=Please log in to view your orders');
        }
        
        // User ke saare orders find karo (latest first)
        const orders = await Order.find({ user: req.session.user.id })
            .sort({ createdAt: -1 }); // Newest orders pehle
            
        console.log('Found orders:', orders.length); // Orders count log karo
        
        // Orders page render karo
        res.render('orders/index', {
            title: 'My Orders',
            orders // Orders list
        });
    } catch (err) {
        console.error('Error fetching orders:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch your orders. Please try again later. Error: ' + err.message
        });
    }
});

// GET - Single order ki details dikhane ke liye route
router.get('/:id', async (req, res) => {
    try {
        // User ID validation
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/users/login?error=Please log in to view order details');
        }
        
        // Order find karo - sirf current user ka order
        const order = await Order.findOne({
            _id: req.params.id, // Order ID
            user: req.session.user.id // Current user ka order
        });
        
        if (!order) {
            // Agar order nahi mila ya permission nahi hai
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Order not found or you do not have permission to view it.'
            });
        }
        
        // Order details page render karo
        res.render('orders/details', {
            title: `Order #${order.orderNumber}`, // Page title order number ke saath
            order // Order details
        });
    } catch (err) {
        console.error('Error fetching order details:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to fetch order details. Please try again later. Error: ' + err.message
        });
    }
});

// POST - Order cancel karne ke liye route
router.post('/:id/cancel', async (req, res) => {
    try {
        // Order find karo - sirf current user ka order
        const order = await Order.findOne({
            _id: req.params.id, // Order ID
            user: req.session.user.id // Current user ka order
        });
        
        if (!order) {
            // Agar order nahi mila ya permission nahi hai
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Order not found or you do not have permission to cancel it.'
            });
        }
        
        // Sirf pending ya processing orders cancel ho sakte hain
        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.redirect(`/my-orders/${order._id}?error=This order cannot be cancelled because it has already been ${order.status}.`);
        }
        
        // Order status ko cancelled kar do
        order.status = 'cancelled';
        await order.save(); // Database mein save karo
        
        // Success message ke saath order details page par redirect karo
        res.redirect(`/my-orders/${order._id}?message=Order has been successfully cancelled.`);
    } catch (err) {
        console.error('Error cancelling order:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to cancel order. Please try again later. Error: ' + err.message
        });
    }
});

// Router export karo
module.exports = router;