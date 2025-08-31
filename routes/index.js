// Index routes - Home page aur general pages ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const Product = require('../models/Product'); // Product model
const Order = require('../models/Order'); // Order model
const Contact = require('../models/Contact'); // Contact model
const User = require('../models/User'); // User model


// Home page route - Main landing page
router.get('/', async (req, res) => {
    try {
        // Homepage ke liye featured products nikalo (maximum 6)
        const featuredProducts = await Product.find({ featured: true }).limit(6);
        
        // Different categories se products nikalo homepage sections ke liye
        const menClothing = await Product.find({ category: 'men-clothing' }).limit(4);
        const womenClothing = await Product.find({ category: 'women-clothing' }).limit(4);
        const electronics = await Product.find({ category: 'electronics' }).limit(4);
        
        // Home template render karo saare products ke saath
        res.render('home', {
            title: 'ShopNow - Home',
            featuredProducts, // Featured products
            menClothing, // Men's clothing products
            womenClothing, // Women's clothing products
            electronics // Electronics products
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

// Email verification route - User ka email verify karne ke liye
router.get('/verify-email', async (req, res) => {
    try {
        const { token, email } = req.query; // URL se token aur email nikalo
        
        // Token aur email dono hone chahiye
        if (!token || !email) {
            return res.redirect('/users/login?error=Invalid verification link');
        }

        // Database mein user find karo token aur email se
        const user = await User.findOne({ 
            email: email.toLowerCase(), 
            emailVerificationToken: token 
        });
        
        if (!user) {
            // Agar user nahi mila to invalid link
            return res.redirect('/users/login?error=Invalid or expired verification link');
        }

        // User ka email verify kar do
        user.isEmailVerified = true;
        user.emailVerificationToken = null; // Token clear kar do
        await user.save(); // Database mein save karo

        // Success message ke saath login page par redirect karo
        return res.redirect('/users/login?message=Email verified successfully. You can now log in.');
    } catch (err) {
        console.error('Verify email error:', err); // Error log karo
        return res.redirect('/users/login?error=Server error verifying email');
    }
});
// Contact Us routes - Contact form ke liye

// GET - Contact form page dikhane ke liye
router.get('/contact-us', (req, res) => {
    res.render('contact-us'); // Contact form template render karo
});

// POST - Contact form submit karne ke liye
router.post('/contact-us', async (req, res) => {
    const { name, email, subject, message } = req.body; // Form data nikalo

    try {
        // Naya contact message create karo
        const newContact = new Contact({ name, email, subject, message });
        await newContact.save(); // Database mein save karo

        // Success message ke saath form page render karo
        res.render('contact-us', {
            successMessage: 'Your message has been sent successfully!'
        });
    } catch (err) {
        console.error('Error saving contact message:', err); // Error log karo
        // Error message ke saath form page render karo
        res.render('contact-us', {
            errorMessage: 'There was an error submitting your message.'
        });
    }
});

// About Us page route
router.get('/about-us', (req, res) => {
  res.render('about-us', {
    title: 'About Us' // Page title
  });
});

// Contact page route (alternative)
router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' }); // Contact template render karo
});

// Order tracking page - Order track karne ke liye form
router.get('/order-tracking', (req, res) => {
    res.render('order-tracking', { 
        title: 'Track Your Order',
        orderFound: false // Initially koi order nahi mila
    });
});

// Order tracking form submit karne ke liye POST route
router.post('/order-tracking', async (req, res) => {
    try {
        const { orderNumber, email } = req.body; // Form se data nikalo
        
        // Input validation - dono fields required hain
        if (!orderNumber || !email) {
            return res.render('order-tracking', { 
                title: 'Track Your Order',
                orderFound: false,
                error: 'Please enter both order number and email'
            });
        }
        
        // Database mein order find karo order number aur email se
        const order = await Order.findOne({ 
            orderNumber: orderNumber, 
            'shippingDetails.email': email 
        });
        
        if (!order) {
            // Agar order nahi mila to error message
            return res.render('order-tracking', { 
                title: 'Track Your Order',
                orderFound: false,
                error: 'Order not found. Please check your order number and email'
            });
        }
        
        // Order mil gaya - order details ke saath page render karo
        res.render('order-tracking', { 
            title: 'Track Your Order',
            orderFound: true, // Order found flag
            order // Order details
        });
    } catch (err) {
        console.error('Order tracking error:', err); // Error log karo
        // Error message ke saath page render karo
        res.render('order-tracking', { 
            title: 'Track Your Order',
            orderFound: false,
            error: 'Error tracking order. Please try again later.'
        });
    }
});

// Privacy Policy page route
router.get('/privacy-policy', (req, res) => {
    res.render('privacy-policy', { 
        title: 'Privacy Policy' 
    });
});

// Terms & Conditions page route
router.get('/terms-conditions', (req, res) => {
    res.render('terms-conditions', { title: 'Terms & Conditions' });
});

// Refund Policy page route
router.get('/refund-policy', (req, res) => {
    res.render('refund-policy', { title: 'Refund Policy' });
});

// Contact page route (duplicate - alternative URL)
router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});

// Contact Us page route (main URL)
router.get('/contact-us', (req, res) => {
    res.render('contact-us', { title: 'Contact Us' });
});

// Router export karo
module.exports = router;