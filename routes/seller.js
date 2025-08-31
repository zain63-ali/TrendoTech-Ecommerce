// Seller routes - Seller panel ke liye routes
const express = require('express'); // Express framework
const router = express.Router(); // Router create karo
const Product = require('../models/Product'); // Product model
const { isSeller } = require('../middleware/auth'); // Seller authentication middleware
const multer = require('multer'); // File upload ke liye
const path = require('path'); // Path utilities
const fs = require('fs'); // File system operations

// File uploads ke liye multer configure karo
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Product category ke base par destination folder decide karo
        const getDestination = (req) => {
            const category = req.body.category;
            let destinationPath = 'public/images/products/';
            
            // Folders create karo agar exist nahi karte
            if (!fs.existsSync(destinationPath)) {
                fs.mkdirSync(destinationPath, { recursive: true });
            }
            
            // Category-specific subfolder banao agar zarurat hai
            if (category) {
                const categoryPath = path.join(destinationPath, category);
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                }
                return categoryPath;
            }
            
            return destinationPath;
        };
        
        cb(null, getDestination(req));
    },
    filename: function(req, file, cb) {
        // Unique filename generate karo timestamp aur extension ke saath
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Sirf images accept karne ke liye file filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Image files allow karo
    } else {
        cb(new Error('Not an image! Please upload only images.'), false); // Non-image files reject karo
    }
};

// Multer upload configuration
const upload = multer({ 
    storage: storage, // Storage settings
    fileFilter: fileFilter, // File filter
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// Saare seller routes par seller middleware apply karo
router.use(isSeller);

// GET - Seller dashboard dikhane ke liye route
router.get('/dashboard', async (req, res) => {
    try {
        // Seller ke products nikalo
        const products = await Product.find({ seller: req.session.user.id }).sort({ createdAt: -1 });
        
        // Seller dashboard render karo
        res.render('seller/dashboard', {
            title: 'Seller Dashboard',
            products, // Seller ke products
            productCount: products.length // Products count
        });
    } catch (err) {
        console.error('Seller dashboard error:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// GET - Product add karne ka form dikhane ke liye route
router.get('/products/add', (req, res) => {
    const formError = req.query.error || null; // Error message nikalo
    // Add product form render karo
    res.render('seller/add-product', {
        title: 'Add New Product',
        formError // Error message
    });
});

// POST - Naya product create karne ke liye route
router.post('/products', upload.single('productImage'), async (req, res) => {
    try {
        const { name, description, price, category } = req.body; // Form data nikalo
        
        // Required fields validation
        if (!name || !description || !price || !category) {
            return res.redirect('/seller/products/add?error=All fields are required');
        }
        
        // Image upload validation
        if (!req.file) {
            return res.redirect('/seller/products/add?error=Product image is required');
        }
        
        // Uploaded image ka relative path create karo
        const imageUrl = '/images/products/' + 
            (category ? category + '/' : '') + 
            req.file.filename;
        
        // Naya product create karo
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            imageUrl,
            inStock: req.body.inStock === 'true', // Stock status
            seller: req.session.user.id // Current seller ID
        });
        
        await newProduct.save(); // Database mein save karo
        
        // Success message ke saath dashboard par redirect karo
        res.redirect('/seller/dashboard?success=Product added successfully');
    } catch (err) {
        console.error('Add product error:', err); // Error log karo
        res.redirect('/seller/products/add?error=' + encodeURIComponent(err.message || 'Server error, please try again'));
    }
});

// GET - Product edit form dikhane ke liye route
router.get('/products/edit/:id', async (req, res) => {
    try {
        // Product find karo (sirf seller ka own product)
        const product = await Product.findOne({ 
            _id: req.params.id,
            seller: req.session.user.id // Seller verification
        });
        
        if (!product) {
            // Agar product nahi mila ya permission nahi hai
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to edit it'
            });
        }
        
        // Edit product form render karo
        res.render('seller/edit-product', {
            title: 'Edit Product',
            product // Product details
        });
    } catch (err) {
        console.error('Edit product form error:', err); // Error log karo
        // Error page render karo
        res.status(500).render('error', {
            title: 'Error',
            message: 'Server error, please try again later'
        });
    }
});

// POST - Product update karne ke liye route
router.post('/products/:id', upload.single('productImage'), async (req, res) => {
    try {
        const { name, description, price, category, inStock } = req.body; // Form data nikalo
        
        // Required fields validation
        if (!name || !description || !price || !category) {
            return res.redirect(`/seller/products/edit/${req.params.id}?error=All fields are required`);
        }
        
        // Product find karo aur seller verify karo
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.session.user.id // Seller verification
        });
        
        if (!product) {
            // Agar product nahi mila ya permission nahi hai
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to edit it'
            });
        }
        
        // Product fields update karo
        product.name = name;
        product.description = description;
        product.price = price;
        product.category = category;
        
        // Agar naya image upload hua hai to update karo
        if (req.file) {
            // Uploaded image ka relative path create karo
            product.imageUrl = '/images/products/' + 
                (category ? category + '/' : '') + 
                req.file.filename;
        }
        
        product.inStock = inStock === 'true'; // Stock status update karo
        
        await product.save(); // Database mein save karo
        
        // Success message ke saath dashboard par redirect karo
        res.redirect('/seller/dashboard?success=Product updated successfully');
    } catch (err) {
        console.error('Update product error:', err); // Error log karo
        res.redirect(`/seller/products/edit/${req.params.id}?error=` + encodeURIComponent(err.message || 'Server error, please try again'));
    }
});

// POST - Product delete karne ke liye route
router.post('/products/delete/:id', async (req, res) => {
    try {
        // Product find karo aur seller verify karo
        const product = await Product.findOne({
            _id: req.params.id,
            seller: req.session.user.id // Seller verification
        });
        
        if (!product) {
            // Agar product nahi mila ya permission nahi hai
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found or you do not have permission to delete it'
            });
        }
        
        // Product delete karo database se
        await Product.findByIdAndDelete(req.params.id);
        
        // Success message ke saath dashboard par redirect karo
        res.redirect('/seller/dashboard?success=Product deleted successfully');
    } catch (err) {
        console.error('Delete product error:', err); // Error log karo
        res.redirect('/seller/dashboard?error=Server error, please try again');
    }
});

// Router export karo
module.exports = router; 