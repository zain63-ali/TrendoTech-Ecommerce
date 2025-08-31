// Required packages aur modules import karo
const express = require('express'); // Express framework
const exphbs = require('express-handlebars'); // Handlebars templating engine
const bodyParser = require('body-parser'); // Request body parsing ke liye
const mongoose = require('mongoose'); // MongoDB connection ke liye
const path = require('path'); // File paths handle karne ke liye
const session = require('express-session'); // User sessions manage karne ke liye
const cookieParser = require('cookie-parser'); // Cookies parse karne ke liye
const helpers = require('./helpers'); // Custom helper functions
require('dotenv').config(); // Environment variables load karo
const User = require('./models/User'); // User model import karo
const { addCartData } = require('./middleware/cart'); // Cart middleware import karo

// Express app initialize karo
const app = express();
// Server port set karo - environment variable ya default 3000
const PORT = process.env.PORT || 3000;

// Handlebars templating engine setup karo
app.engine('hbs', exphbs.engine({
    extname: '.hbs', // File extension .hbs set karo
    defaultLayout: 'main', // Default layout main.hbs use karo
    layoutsDir: path.join(__dirname, 'views/layouts'), // Layouts folder ka path
    partialsDir: path.join(__dirname, 'views/partials'), // Partials folder ka path
    helpers: helpers, // Custom helper functions include karo
    // Handlebars warnings fix karne ke liye prototype access allow karo
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));
// View engine ko handlebars set karo
app.set('view engine', 'hbs');

// Middleware setup karo
app.use(bodyParser.urlencoded({ extended: false })); // URL-encoded data parse karo
app.use(bodyParser.json()); // JSON data parse karo
app.use(cookieParser()); // Cookies parse karo
// Session configuration - user login state maintain karne ke liye
app.use(session({
    secret: 'shopnow-ecommerce-secret', // Session encryption key
    resave: false, // Session ko har request par save na karo
    saveUninitialized: true, // Naye sessions ko save karo
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Cookie expiry - 1 din
}));
// Static files serve karo (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Global template variables setup - har template mein available honge
app.use(async (req, res, next) => {
    // Session cart initialize karo agar exist nahi karta
    if (!req.session.cart) req.session.cart = [];
    
    // Agar user login hai to wishlist count nikalo
    let wishlistCount = 0;
    if (req.session.user) {
        try {
            // Database se user find karo
            const user = await User.findById(req.session.user.id);
            // Wishlist items count karo
            wishlistCount = user.wishlist ? user.wishlist.length : 0;
            // Session mein store karo
            req.session.wishlistCount = wishlistCount;
        } catch (err) {
            console.error('Error getting wishlist count:', err);
        }
    }
    
    // Template variables set karo - har view mein available honge
    res.locals.wishlistCount = wishlistCount; // Wishlist count
    res.locals.user = req.session.user || null; // User information
    
    // Success/Error messages URL se nikalo aur templates mein pass karo
    res.locals.successMessage = req.query.message || null;
    res.locals.errorMessage = req.query.error || null;
    
    next(); // Next middleware par jao
});

// Cart data middleware add karo - har request mein cart count aur total calculate karta hai
app.use(addCartData);

// MongoDB Database Connection
const adminRoutes = require('./routes/admin'); // Admin routes import karo
// Database URI - environment variable ya local MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce';

// MongoDB se connection establish karo
mongoose.connect(mongoUri, {
    useNewUrlParser: true, // New URL parser use karo
    useUnifiedTopology: true // New connection management use karo
})
.then(() => {
    console.log('MongoDB Connected'); // Success message
    
    // Database connection ke baad admin user create karo (agar function exist karta hai)
    if (typeof adminRoutes.createAdminUser === 'function') {
        adminRoutes.createAdminUser().catch(err => console.error('Create admin error:', err));
    }
    
    // Server sirf successful database connection ke baad start karo
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
})
.catch(err => {
    // Database connection error handle karo
    console.log('MongoDB Connection Error:', err);
});

// Routes import karo - har feature ke liye alag route file
const indexRoutes = require('./routes/index'); // Home page routes
const productRoutes = require('./routes/products'); // Product related routes
const cartRoutes = require('./routes/cart'); // Shopping cart routes
const userRoutes = require('./routes/users'); // User authentication routes
const sellerRoutes = require('./routes/seller'); // Seller dashboard routes
const blogRoutes = require('./routes/blogs'); // Blog system routes
const wishlistRoutes = require('./routes/wishlist'); // Wishlist routes
const orderRoutes = require('./routes/orders'); // Order management routes
const feedbackRoutes = require('./routes/feedback'); // Feedback system routes

// Routes ko specific paths par mount karo
app.use('/', indexRoutes); // Home page - /
app.use('/products', productRoutes); // Products - /products/*
app.use('/cart', cartRoutes); // Cart - /cart/*
app.use('/users', userRoutes); // Users - /users/*
app.use('/admin', adminRoutes); // Admin panel - /admin/*
app.use('/seller', sellerRoutes); // Seller panel - /seller/*
app.use('/blogs', blogRoutes); // Blogs - /blogs/*
app.use('/wishlist', wishlistRoutes); // Wishlist - /wishlist/*
app.use('/my-orders', orderRoutes); // Orders - /my-orders/*
app.use('/feedback', feedbackRoutes); // Feedback - /feedback/*

// Note: Server sirf successful database connection ke baad start hota hai (upar dekho)